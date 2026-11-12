use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf, sync::{Mutex, atomic::{AtomicU64, Ordering}}};
use tauri::{AppHandle, Emitter, Manager};

type Result<T> = std::result::Result<T, String>;
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
pub struct Geometry { pub x:i32, pub y:i32, pub width:f64, pub height:f64 }
impl Geometry {
    fn validate(&self)->Result<()> {
        if !self.width.is_finite() || !self.height.is_finite() || self.width<240.0 || self.height<180.0 || self.width>20000.0 || self.height>20000.0 {
            return Err("Invalid study note window size".into());
        }
        Ok(())
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RichNote { pub document:Option<serde_json::Value>, pub markdown:String }
pub struct NoteStore { pub root:PathBuf }
impl NoteStore {
    pub fn read(&self)->Result<String> {
        let markdown=self.root.join("study-note.md");
        let path=if markdown.exists(){markdown}else{self.root.join("study-note.txt")};
        match fs::read_to_string(path) {Ok(text)=>Ok(text),Err(e) if e.kind()==std::io::ErrorKind::NotFound=>Ok(String::new()),Err(e)=>Err(format!("Could not read your study note. Its file is preserved: {e}"))}
    }
    pub fn write(&self,text:&str)->Result<()> { crate::store::atomic(&self.root.join("study-note.md"),text.as_bytes()) }
    pub fn read_rich(&self)->Result<RichNote>{
        let path=self.root.join("study-note-rich.json");
        if !path.exists(){return Ok(RichNote{document:None,markdown:self.read()?})}
        let note:RichNote=serde_json::from_slice(&fs::read(path).map_err(|e|e.to_string())?).map_err(|e|format!("Could not read rich note; original files preserved: {e}"))?;
        validate_rich(&note)?;Ok(note)
    }
    pub fn write_rich(&self,note:&RichNote)->Result<()>{
        validate_rich(note)?;
        let path=self.root.join("study-note-rich.json");
        let backup=self.root.join("study-note-before-rich.md");
        if !path.exists()&&!backup.exists(){crate::store::atomic(&backup,self.read()?.as_bytes())?;}
        crate::store::atomic(&path,&serde_json::to_vec_pretty(note).map_err(|e|e.to_string())?)?;
        // JSON is canonical; Markdown is an export and can be regenerated.
        self.write(&note.markdown)
    }
    pub fn geometry(&self)->Result<Option<Geometry>> {
        let path=self.root.join("study-note-window.json");
        if !path.exists(){return Ok(None)}
        let geometry:Geometry=serde_json::from_slice(&fs::read(path).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;
        geometry.validate()?;Ok(Some(geometry))
    }
    pub fn write_geometry(&self,g:Geometry)->Result<()> {
        g.validate()?;
        crate::store::atomic(&self.root.join("study-note-window.json"),&serde_json::to_vec(&g).map_err(|e|e.to_string())?)
    }
}
fn validate_rich(note:&RichNote)->Result<()>{
    let document=note.document.as_ref().ok_or("Missing rich-text document")?;
    if document.get("type").and_then(|v|v.as_str())!=Some("doc")||!document.get("content").is_some_and(|v|v.is_array()){
        return Err("Invalid rich-text document; saved note was not changed".into());
    }
    Ok(())
}
#[tauri::command] pub async fn read_rich_study_note(app:AppHandle)->Result<RichNote>{
    tauri::async_runtime::spawn_blocking(move||app.state::<StudyState>().store.lock().map_err(|e|e.to_string())?.read_rich()).await.map_err(|e|e.to_string())?
}
#[tauri::command] pub async fn write_rich_study_note(app:AppHandle,note:RichNote)->Result<()>{
    tauri::async_runtime::spawn_blocking(move||app.state::<StudyState>().store.lock().map_err(|e|e.to_string())?.write_rich(&note)).await.map_err(|e|e.to_string())?
}
pub struct StudyState { pub store:Mutex<NoteStore>, pub generation:AtomicU64 }
#[tauri::command]
pub async fn read_study_note(app:AppHandle)->Result<String>{
    tauri::async_runtime::spawn_blocking(move||app.state::<StudyState>().store.lock().map_err(|e|e.to_string())?.read()).await.map_err(|e|e.to_string())?
}
#[tauri::command]
pub async fn write_study_note(app:AppHandle,text:String)->Result<()>{
    tauri::async_runtime::spawn_blocking(move||app.state::<StudyState>().store.lock().map_err(|e|e.to_string())?.write(&text)).await.map_err(|e|e.to_string())?
}
#[tauri::command]
pub fn hide_study_note(app:AppHandle,restore_focus:bool)->Result<()> {
    if let Some(w)=app.get_webview_window("study"){w.hide().map_err(|e|e.to_string())?;}
    if restore_focus {crate::restore(&app)}
    Ok(())
}
#[tauri::command]
pub fn toggle_study_note(app:AppHandle){toggle(&app)}
pub fn toggle(app:&AppHandle){
    let handle=app.clone();let _=app.run_on_main_thread(move||{
        if handle.state::<crate::ScreenBusy>().0.load(Ordering::SeqCst){return}
        if let Some(w)=handle.get_webview_window("study"){
            if w.is_visible().unwrap_or(false){let _=w.emit("study-dismiss",());return}
            #[cfg(target_os="macos")] crate::remember_main(&handle);
            crate::configure_overlay(&w);
            let _=w.show();let _=w.set_focus();let _=w.emit("study-resume",());
        }
    });
}
pub fn setup(app:&AppHandle)->Result<()> {
    let root=app.path().app_data_dir().map_err(|e|e.to_string())?;
    app.manage(StudyState{store:Mutex::new(NoteStore{root}),generation:AtomicU64::new(0)});
    let w=app.get_webview_window("study").ok_or("Missing study window")?;
    // Restore once before move/resize listeners are registered. Showing again
    // never resets the user's geometry or remounts the editor.
    let geometry=app.state::<StudyState>().store.lock().unwrap().geometry();
    if let Ok(Some(g))=geometry {
        let _=w.set_size(tauri::LogicalSize::new(g.width,g.height));
        let monitors=w.available_monitors().map_err(|e|e.to_string())?;
        let visible=monitors.iter().any(|m|{
            let p=m.position();let s=m.size();let scale=m.scale_factor();
            g.x as f64+g.width*scale>p.x as f64+64.0 && (g.x as f64)<p.x as f64+s.width as f64-64.0 &&
            g.y as f64+g.height*scale>p.y as f64+64.0 && (g.y as f64)<p.y as f64+s.height as f64-64.0
        });
        if visible {let _=w.set_position(tauri::PhysicalPosition::new(g.x,g.y));}else{let _=w.center();}
    }else{let _=w.center();}
    crate::configure_overlay(&w);
    let handle=app.clone();
    w.on_window_event(move|event|{
        match event {
            tauri::WindowEvent::CloseRequested{api,..}=>{api.prevent_close();if let Some(w)=handle.get_webview_window("study"){let _=w.emit("study-dismiss",());}},
            tauri::WindowEvent::Moved(_)|tauri::WindowEvent::Resized(_)=>save_geometry_later(&handle),
            _=>{}
        }
    });
    Ok(())
}
fn save_geometry_later(app:&AppHandle){
    let Some(w)=app.get_webview_window("study") else{return};
    let (Ok(p),Ok(s),Ok(scale))=(w.outer_position(),w.inner_size(),w.scale_factor()) else{return};
    let g=Geometry{x:p.x,y:p.y,width:s.width as f64/scale,height:s.height as f64/scale};
    let generation=app.state::<StudyState>().generation.fetch_add(1,Ordering::SeqCst)+1;
    let app=app.clone();
    tauri::async_runtime::spawn_blocking(move||{
        std::thread::sleep(std::time::Duration::from_millis(250));
        let state=app.state::<StudyState>();let store=state.store.lock().unwrap();
        if state.generation.load(Ordering::SeqCst)!=generation{return}
        if let Err(e)=store.write_geometry(g){let _=app.emit_to("study","study-geometry-error",e);}
    });
}
#[cfg(test)] mod tests {
    use super::*;
    #[test] fn note_and_geometry_survive_reopen_without_touching_capture(){
        let root=std::env::temp_dir().join(format!("betterpad-study-{}",uuid::Uuid::new_v4()));fs::create_dir_all(&root).unwrap();
        fs::write(root.join("draft.json"),"capture stays separate").unwrap();
        let s=NoteStore{root:root.clone()};assert_eq!(s.read().unwrap(),"");
        let text="CCA notes\n∀x: café, İstanbul\n\n  indented";s.write(text).unwrap();
        let g=Geometry{x:-800,y:120,width:710.0,height:525.5};s.write_geometry(g).unwrap();
        let reopened=NoteStore{root:root.clone()};assert_eq!(reopened.read().unwrap(),text);assert_eq!(reopened.geometry().unwrap(),Some(g));
        assert_eq!(fs::read_to_string(root.join("draft.json")).unwrap(),"capture stays separate");
        assert!(s.write_geometry(Geometry{width:f64::NAN,..g}).is_err());assert_eq!(s.geometry().unwrap(),Some(g));
        s.write("").unwrap();assert_eq!(s.read().unwrap(),"");fs::remove_dir_all(root).unwrap();
    }
    #[test] fn legacy_text_note_is_preserved_when_markdown_is_saved(){
        let root=std::env::temp_dir().join(format!("betterpad-study-{}",uuid::Uuid::new_v4()));fs::create_dir_all(&root).unwrap();
        fs::write(root.join("study-note.txt"),"old notes").unwrap();
        let s=NoteStore{root:root.clone()};assert_eq!(s.read().unwrap(),"old notes");
        s.write("# Updated notes\n\n**Markdown**").unwrap();assert_eq!(s.read().unwrap(),"# Updated notes\n\n**Markdown**");
        assert_eq!(fs::read_to_string(root.join("study-note.txt")).unwrap(),"old notes");fs::remove_dir_all(root).unwrap();
    }
    #[test] fn rich_note_roundtrip_keeps_formatting_and_original_backup(){
        let root=std::env::temp_dir().join(format!("betterpad-rich-{}",uuid::Uuid::new_v4()));fs::create_dir_all(&root).unwrap();
        let s=NoteStore{root:root.clone()};s.write("# Original\n\n**Keep me**").unwrap();
        assert!(s.read_rich().unwrap().document.is_none());
        let doc=serde_json::json!({"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Formatted","marks":[{"type":"underline"},{"type":"bold"}]}]}]});
        let note=RichNote{document:Some(doc.clone()),markdown:"**Formatted**".into()};s.write_rich(&note).unwrap();
        assert_eq!(s.read_rich().unwrap().document,Some(doc));assert_eq!(s.read().unwrap(),"**Formatted**");
        assert_eq!(fs::read_to_string(root.join("study-note-before-rich.md")).unwrap(),"# Original\n\n**Keep me**");
        let invalid=RichNote{document:None,markdown:"do not write".into()};assert!(s.write_rich(&invalid).is_err());assert_eq!(s.read().unwrap(),"**Formatted**");
        s.write_rich(&note).unwrap();assert_eq!(fs::read_to_string(root.join("study-note-before-rich.md")).unwrap(),"# Original\n\n**Keep me**");
        fs::remove_dir_all(root).unwrap();
    }
    #[test] fn failed_save_preserves_existing_note(){
        let root=std::env::temp_dir().join(format!("betterpad-study-{}",uuid::Uuid::new_v4()));fs::create_dir_all(&root).unwrap();
        let s=NoteStore{root:root.clone()};s.write("keep me").unwrap();
        // A missing parent is a deterministic failed-write case even as root.
        let bad=NoteStore{root:root.join("missing")};assert!(bad.write("replacement").is_err());assert_eq!(s.read().unwrap(),"keep me");fs::remove_dir_all(root).unwrap();
    }
}

#[tauri::command]
pub async fn export_study_note(app:AppHandle,path:String)->Result<()>{
    tauri::async_runtime::spawn_blocking(move||{
        let text=app.state::<StudyState>().store.lock().map_err(|e|e.to_string())?.read()?;
        let destination=PathBuf::from(path);
        if !destination.is_absolute(){return Err("Choose an absolute export path".into())}
        crate::store::atomic(&destination,text.as_bytes())
    }).await.map_err(|e|e.to_string())?
}
