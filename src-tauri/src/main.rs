#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod store;
mod study;
use std::{sync::{Mutex, atomic::{AtomicBool, Ordering}}, path::PathBuf};
use tauri::{Manager, Emitter, AppHandle};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState, Shortcut, Modifiers, Code};
use store::{Store, Draft, Capture, History};
struct Data(Mutex<Store>);
struct Previous(Mutex<i32>);
struct ScreenBusy(AtomicBool);
struct ActiveView(Mutex<String>);
#[tauri::command] fn remember_view(app:AppHandle,view:String){
    if matches!(view.as_str(),"capture"|"history"|"settings"){*app.state::<ActiveView>().0.lock().unwrap()=view;}
}
struct Hotkeys(Mutex<Vec<Shortcut>>);
struct ShortcutWarning(Mutex<Option<String>>);
#[derive(serde::Serialize)] struct Preferences { alternate:bool, warning:Option<String> }
#[tauri::command] fn get_preferences(app:AppHandle)->Preferences{
    let root=app.state::<Data>().0.lock().unwrap().root.clone();
    let alternate=std::fs::read(root.join("preferences.json")).ok().and_then(|b|serde_json::from_slice::<bool>(&b).ok()).unwrap_or(false);
    let warning=app.state::<ShortcutWarning>().0.lock().unwrap().clone();
    Preferences{alternate,warning}
}
async fn work<T: Send + 'static>(app: AppHandle, f: impl FnOnce(&Store)->Result<T,String> + Send + 'static) -> Result<T,String> {
    tauri::async_runtime::spawn_blocking(move || { let state = app.state::<Data>(); let s = state.0.lock().map_err(|e|e.to_string())?; f(&s) }).await.map_err(|e|e.to_string())?
}
#[tauri::command] async fn get_draft(app:AppHandle)->Result<Draft,String>{work(app, |s|s.draft()).await}
#[tauri::command] async fn update_text(app:AppHandle,text:String)->Result<Draft,String>{work(app,move|s|s.update_text(text)).await}
#[tauri::command] async fn attach_files(app:AppHandle,paths:Vec<String>)->Result<Draft,String>{work(app,move|s|s.attach(paths)).await}
#[tauri::command] async fn attach_image(app:AppHandle,data:String)->Result<Draft,String>{work(app,move|s|s.image(&data)).await}
#[tauri::command] async fn remove_attachment(app:AppHandle,name:String)->Result<Draft,String>{work(app,move|s|s.remove_attachment(name)).await}
#[tauri::command] async fn save_capture(app:AppHandle,text:String)->Result<Capture,String>{work(app,move|s|s.save(text)).await}
#[tauri::command] async fn get_history(app:AppHandle)->Result<History,String>{work(app,|s|s.history()).await}
#[tauri::command] async fn restore_capture(app:AppHandle,id:String)->Result<(),String>{work(app,move|s|s.restore(id)).await}
#[tauri::command] async fn delete_capture(app:AppHandle,id:String)->Result<(),String>{work(app,move|s|s.delete(id)).await}
#[tauri::command] async fn open_files(app:AppHandle,id:Option<String>,name:Option<String>)->Result<(),String>{
    work(app,move|s|{
        let path = if let Some(id)=id {store::safe_name(&id)?; let dir=s.root.join("Captures").join(id); if let Some(name)=name{store::safe_name(&name)?;dir.join("attachments").join(name)}else{dir}}else{s.root.clone()};
        std::process::Command::new("/usr/bin/open").arg(path).spawn().map_err(|e|e.to_string())?; Ok(())
    }).await
}
#[tauri::command] async fn preview(app:AppHandle,id:Option<String>,name:String)->Result<String,String>{
    work(app,move|s|{
        use base64::Engine;
        store::safe_name(&name)?;
        let path=if let Some(id)=id{store::safe_name(&id)?;s.root.join("Captures").join(id).join("attachments").join(&name)}else{s.root.join("Draft").join(&name)};
        let mime=match path.extension().and_then(|e|e.to_str()).unwrap_or("").to_lowercase().as_str(){"png"=>"image/png","jpg"|"jpeg"=>"image/jpeg","gif"=>"image/gif","webp"=>"image/webp",_=>return Err("No preview".into())};
        if std::fs::metadata(&path).map_err(|e|e.to_string())?.len()>10*1024*1024{return Err("Preview exceeds 10 MB".into())}
        Ok(format!("data:{};base64,{}",mime,base64::engine::general_purpose::STANDARD.encode(std::fs::read(path).map_err(|e|e.to_string())?)))
    }).await
}
#[cfg(target_os="macos")]
fn remember_main(app:&AppHandle){unsafe{
    use objc::{class,msg_send,sel,sel_impl};
    let workspace:*mut objc::runtime::Object=msg_send![class!(NSWorkspace), sharedWorkspace];
    let front:*mut objc::runtime::Object=msg_send![workspace, frontmostApplication];
    if !front.is_null(){let pid:i32=msg_send![front, processIdentifier];if pid!=std::process::id() as i32{*app.state::<Previous>().0.lock().unwrap()=pid;}}
}}
#[cfg(target_os="macos")]
fn restore(app:&AppHandle){
    let handle=app.clone();let _=app.run_on_main_thread(move||restore_main(&handle));
}
#[cfg(target_os="macos")]
fn restore_main(app:&AppHandle){unsafe{
    use objc::{class,msg_send,sel,sel_impl};
    let pid=*app.state::<Previous>().0.lock().unwrap();
    if pid>0{let target:*mut objc::runtime::Object=msg_send![class!(NSRunningApplication), runningApplicationWithProcessIdentifier:pid];if !target.is_null(){let _:bool=msg_send![target, activateWithOptions:0usize];}}
}}
#[cfg(not(target_os="macos"))] fn restore(_: &AppHandle){}
// All AppKit changes must occur on the main thread. A high window level alone
// does not put a window in a browser's separate full-screen Space.
#[cfg(target_os="macos")]
fn configure_overlay(window: &tauri::WebviewWindow) {
    use objc::{msg_send, sel, sel_impl};
    if let Ok(raw) = window.ns_window() { unsafe {
        let native = raw as *mut objc::runtime::Object;
        let current: usize = msg_send![native, collectionBehavior];
        const JOIN_ALL_SPACES: usize = 1 << 0;
        const MOVE_TO_ACTIVE_SPACE: usize = 1 << 1;
        const MANAGED: usize = 1 << 2;
        const PARTICIPATES_IN_CYCLE: usize = 1 << 5;
        const IGNORES_CYCLE: usize = 1 << 6;
        const FULL_SCREEN_PRIMARY: usize = 1 << 7;
        const FULL_SCREEN_AUXILIARY: usize = 1 << 8;
        const FULL_SCREEN_NONE: usize = 1 << 9;
        const PRIMARY: usize = 1 << 16;
        const AUXILIARY: usize = 1 << 17;
        const JOIN_ALL_APPLICATIONS: usize = 1 << 18; // macOS 13+, our minimum
        let behavior = (current & !(MOVE_TO_ACTIVE_SPACE | MANAGED | PARTICIPATES_IN_CYCLE
            | FULL_SCREEN_PRIMARY | FULL_SCREEN_NONE | PRIMARY | AUXILIARY))
            | JOIN_ALL_SPACES | IGNORES_CYCLE | FULL_SCREEN_AUXILIARY | JOIN_ALL_APPLICATIONS;
        let _: () = msg_send![native, setCollectionBehavior: behavior];
        let _: () = msg_send![native, setLevel: 25isize]; // NSStatusWindowLevel
    }}
}
#[cfg(not(target_os="macos"))]
fn configure_overlay(_: &tauri::WebviewWindow) {}
fn show(app:&AppHandle,view:&str){
    let handle = app.clone();
    let view = view.to_owned();
    let _ = app.run_on_main_thread(move || {
        if handle.state::<ScreenBusy>().0.load(Ordering::SeqCst) { return; }
        #[cfg(target_os="macos")] remember_main(&handle);
        if let Some(w) = handle.get_webview_window("main") {
            let resume = *handle.state::<ActiveView>().0.lock().unwrap() == view;
            let capture = view == "capture";
            if !resume { let _ = w.set_size(tauri::LogicalSize::new(if capture {420.0} else if view=="history" {860.0} else {660.0}, if capture {64.0} else if view=="history" {560.0} else {480.0})); }
            let _ = w.set_resizable(!capture);
            // Apply before showing/focusing so macOS never relocates to a desktop Space.
            configure_overlay(&w);
            if !resume {
            if let Ok(cursor) = handle.cursor_position() {
                if let Ok(Some(monitor)) = handle.monitor_from_point(cursor.x, cursor.y) {
                    let scale = monitor.scale_factor();
                    let origin = monitor.position();
                    let size = monitor.size();
                    let width = if capture {420.0} else if view=="history" {860.0} else {660.0};
                    let height = if capture {64.0} else if view=="history" {560.0} else {480.0};
                    let _ = w.set_position(tauri::PhysicalPosition::new(
                        origin.x + ((size.width as f64 - width * scale) / 2.0).max(0.0) as i32,
                        origin.y + ((size.height as f64 - height * scale) / 2.0).max(0.0) as i32));
                }
            }
            }
            let _ = w.show();
            let _ = w.set_focus();
            configure_overlay(&w);
            *handle.state::<ActiveView>().0.lock().unwrap()=view.clone();
            let _ = w.emit(if resume {"resume"} else {"navigate"}, view);
        }
    });
}
#[tauri::command] fn hide_window(app:AppHandle,restore_focus:Option<bool>)->Result<(),String>{if let Some(w)=app.get_webview_window("main"){w.hide().map_err(|e|e.to_string())?;}if restore_focus.unwrap_or(true){restore(&app);}Ok(())}
#[tauri::command] fn navigate(app:AppHandle,view:String){show(&app,&view)}
#[tauri::command] fn quit_app(app:AppHandle){if let Some(w)=app.get_webview_window("study"){let _=w.emit("study-quit",());}else{app.exit(0)}}
#[tauri::command] fn finish_quit(app:AppHandle){app.exit(0)}
#[cfg(target_os="macos")]
#[link(name="CoreGraphics",kind="framework")]
extern "C" {
    fn CGPreflightScreenCaptureAccess() -> bool;
    fn CGRequestScreenCaptureAccess() -> bool;
}
async fn prepare_screenshot(app:&AppHandle)->Result<(),String>{
    let (send,receive)=tauri::async_runtime::channel(1);
    let handle=app.clone();
    app.run_on_main_thread(move||{
        #[cfg(target_os="macos")]
        let result=unsafe{
            if !CGPreflightScreenCaptureAccess(){
                let _=CGRequestScreenCaptureAccess();
                Err("Screen Recording permission is required to capture other apps. Enable Betterpad Tauri (or your Terminal while running in development) in System Settings → Privacy & Security → Screen Recording, then fully quit and reopen Betterpad. Your draft is unchanged.".to_owned())
            }else{Ok(())}
        };
        #[cfg(not(target_os="macos"))]
        let result:Result<(),String>=Err("Screenshot capture currently requires macOS".into());
        if result.is_ok(){
            if let Some(w)=handle.get_webview_window("main"){let _=w.hide();}
            if let Some(w)=handle.get_webview_window("study"){let _=w.hide();}
            // Do not activate the previous app: activation can switch away from
            // the fullscreen Space the user is actually trying to capture.
        }
        let _=send.try_send(result);
    }).map_err(|e|e.to_string())?;
    let mut receive=receive;
    receive.recv().await.ok_or("Screenshot preparation interrupted")?
}
#[tauri::command] async fn screenshot(app:AppHandle)->Result<Draft,String>{
    if app.state::<ScreenBusy>().0.swap(true,Ordering::SeqCst){return Err("Screenshot selection already active".into())}
    let _=app.emit("screenshot-started",());
    let result=async {
        prepare_screenshot(&app).await?;
        work(app.clone(),|s|{
            std::thread::sleep(std::time::Duration::from_millis(250));
            let file=std::env::temp_dir().join(format!("betterpad-{}.png",uuid::Uuid::new_v4()));
            let status=std::process::Command::new("/usr/sbin/screencapture").args(["-i","-x"]).arg(&file).status().map_err(|e|e.to_string())?;
            let result=if file.is_file(){s.attach(vec![file.to_string_lossy().into_owned()])}else if status.success(){s.draft()}else{Err("Screenshot cancelled or unavailable. If you did not cancel, check Screen Recording permission and relaunch Betterpad.".into())};
            let _=std::fs::remove_file(file);result
        }).await
    }.await;
    app.state::<ScreenBusy>().0.store(false,Ordering::SeqCst);show(&app,"capture");result
}
#[tauri::command] fn set_shortcuts(app:AppHandle,alternate:bool)->Result<(),String>{
    let mods=if alternate{Modifiers::SUPER|Modifiers::SHIFT}else{Modifiers::CONTROL|Modifiers::ALT};
    let next:Vec<_>=[Code::Space,Code::KeyH,Code::KeyS].iter().map(|c|Shortcut::new(Some(mods),*c)).collect();
    let mut current=app.state::<Hotkeys>().0.lock().unwrap().clone();
    for key in &current{let _=app.global_shortcut().unregister(*key);}
    let mut registered=Vec::new();
    for key in &next{if let Err(e)=app.global_shortcut().register(*key){for k in registered{let _=app.global_shortcut().unregister(k);}for k in &current{let _=app.global_shortcut().register(*k);}return Err(format!("Shortcut unavailable. Previous shortcuts restored: {e}"));}registered.push(*key);}
    current=next;*app.state::<Hotkeys>().0.lock().unwrap()=current;
    *app.state::<ShortcutWarning>().0.lock().unwrap()=None;
    let root=app.state::<Data>().0.lock().unwrap().root.clone();
    std::fs::write(root.join("preferences.json"),if alternate{"true"}else{"false"}).map_err(|e|e.to_string())?;Ok(())
}
fn main(){
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app,_,_|show(app,"capture")))
        .plugin(tauri_plugin_dialog::init()).plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().with_handler(|app,key,event|{
            if event.state()!=ShortcutState::Pressed{return}
            if key==&Shortcut::new(Some(Modifiers::SUPER|Modifiers::SHIFT),Code::KeyN){study::toggle(app);return}
            let keys=app.state::<Hotkeys>().0.lock().unwrap().clone();
            if let Some(index)=keys.iter().position(|k|k==key){match index{
                0=>{if let Some(w)=app.get_webview_window("main"){if w.is_visible().unwrap_or(false){let _=w.emit("request-dismiss",());}else{let view=app.state::<ActiveView>().0.lock().unwrap().clone();show(app,&view)}}},
                1=>{if app.state::<ActiveView>().0.lock().unwrap().as_str()=="history" && app.get_webview_window("main").is_some_and(|w|w.is_visible().unwrap_or(false)){let _=app.emit("request-dismiss",());}else{show(app,"history")}},
                _=>{let app=app.clone();tauri::async_runtime::spawn(async move{let result=screenshot(app.clone()).await;let _=app.emit("screenshot-finished",result);});}
            }}
        }).build())
        .manage(ActiveView(Mutex::new(String::new()))).manage(ShortcutWarning(Mutex::new(None))).manage(Previous(Mutex::new(0))).manage(ScreenBusy(AtomicBool::new(false))).manage(Hotkeys(Mutex::new(Vec::new())))
        .setup(|app|{
            // Use a separate collection. Import from the Swift app explicitly to avoid concurrent writers.
            let store=Store::new(app.path().app_data_dir()?).map_err(std::io::Error::other)?;app.manage(Data(Mutex::new(store)));
            #[cfg(target_os="macos")] app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            use tauri::menu::{Menu,MenuItem};
            let menu=Menu::with_items(app,&[&MenuItem::with_id(app,"capture","Capture",true,None::<&str>)?,&MenuItem::with_id(app,"history","History",true,None::<&str>)?,&MenuItem::with_id(app,"study","Study note — ⌘⇧N",true,None::<&str>)?,&MenuItem::with_id(app,"settings","Settings",true,None::<&str>)?,&MenuItem::with_id(app,"quit","Quit Betterpad Tauri",true,None::<&str>)?])?;
            let mut pixels=vec![0u8;16*16*4];for y in 3..13{for x in 3..13{if (7..9).contains(&x)||(7..9).contains(&y){let i=(y*16+x)*4;pixels[i+3]=255;}}}
            let icon=tauri::image::Image::new_owned(pixels,16,16);
            tauri::tray::TrayIconBuilder::new().icon(icon).icon_as_template(true).tooltip("Betterpad").menu(&menu).on_menu_event(|app,e|{let id=e.id.as_ref();if id=="quit"{let _=app.emit("request-quit",());}else if id=="study"{study::toggle(app)}else{show(app,id)}}).build(app)?;
            study::setup(app.handle()).map_err(std::io::Error::other)?;
            if let Err(e)=app.global_shortcut().register(Shortcut::new(Some(Modifiers::SUPER|Modifiers::SHIFT),Code::KeyN)){
                let _=app.emit("study-shortcut-error",format!("Command–Shift–N is in use: {e}. Open Study note from the menu bar."));
                eprintln!("Study shortcut unavailable: {e}");
            }
            let alternate=get_preferences(app.handle().clone()).alternate;
            if let Err(e)=set_shortcuts(app.handle().clone(),alternate){*app.state::<ShortcutWarning>().0.lock().unwrap()=Some(e);}
            let handle=app.handle().clone();if let Some(w)=app.get_webview_window("main"){w.on_window_event(move|event|{if let tauri::WindowEvent::CloseRequested{api,..}=event{api.prevent_close();if let Some(w)=handle.get_webview_window("main"){let _=w.emit("request-dismiss",());}}});}
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_draft,update_text,attach_files,attach_image,remove_attachment,save_capture,get_history,delete_capture,restore_capture,open_files,preview,hide_window,navigate,screenshot,set_shortcuts,get_preferences,import_swift,quit_app,remember_view,study::export_study_note,study::read_study_note,study::write_study_note,study::hide_study_note,study::toggle_study_note,study::read_rich_study_note,study::write_rich_study_note,finish_quit])
        .run(tauri::generate_context!()).expect("Could not start Betterpad");
}
#[tauri::command] async fn import_swift(app:AppHandle)->Result<usize,String>{
    work(app,|s|{
        let old=std::env::var_os("HOME").map(PathBuf::from).ok_or("Home directory unavailable")?.join("Library/Application Support/Betterpad");
        if !old.join("Captures").is_dir(){return Err("No saved Swift demo collection was found.".into())}
        let source=Store{root:old};let history=source.history()?;
        if !history.warnings.is_empty(){return Err("Some original captures are unreadable. Import stopped; originals unchanged.".into())}
        let mut count=0;
        for c in history.captures{
            let target=s.root.join("Captures").join(&c.id);if target.exists(){continue}
            let from=source.root.join("Captures").join(&c.id);let temp=s.root.join("Captures").join(format!(".import-{}",c.id));
            let result=(||->Result<(),String>{std::fs::create_dir_all(temp.join("attachments")).map_err(|e|e.to_string())?;for n in ["entry.md","capture.json"]{std::fs::copy(from.join(n),temp.join(n)).map_err(|e|e.to_string())?;}for n in &c.attachments{std::fs::copy(from.join("attachments").join(n),temp.join("attachments").join(n)).map_err(|e|e.to_string())?;}std::fs::rename(&temp,&target).map_err(|e|e.to_string())?;Ok(())})();
            if result.is_err(){let _=std::fs::remove_dir_all(temp);}result?;count+=1;
        }Ok(count)
    }).await
}
