use serde::{Deserialize, Serialize};
use std::{fs, path::{Path, PathBuf}, time::{SystemTime, UNIX_EPOCH}};
use uuid::Uuid;

// Deliberately keep Swift JSONEncoder's seconds-since-2001 representation.
const SWIFT_EPOCH: f64 = 978307200.0;
#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Capture { pub id: String, pub created_at: f64, pub text: String, pub attachments: Vec<String> }
#[derive(Clone, Serialize, Deserialize, Default, Debug)]
pub struct Draft { pub text: String, pub attachments: Vec<String> }
#[derive(Serialize)]
pub struct History { pub captures: Vec<Capture>, pub warnings: Vec<String> }
pub struct Store { pub root: PathBuf }
type Result<T> = std::result::Result<T, String>;
fn err(e: impl std::fmt::Display) -> String { e.to_string() }
pub fn safe_name(value: &str) -> Result<()> {
    if value.is_empty() || value == "." || value == ".." || value.contains('/') || value.contains('\\') { Err("Invalid file identifier".into()) } else { Ok(()) }
}
pub(crate) fn atomic(path: &Path, bytes: &[u8]) -> Result<()> {
    let temp = path.with_extension(format!("tmp-{}", Uuid::new_v4()));
    let result = (|| { fs::write(&temp, bytes).map_err(err)?; fs::File::open(&temp).map_err(err)?.sync_all().map_err(err)?; fs::rename(&temp, path).map_err(err) })();
    if result.is_err() { let _ = fs::remove_file(&temp); } result
}
impl Store {
    pub fn new(root: PathBuf) -> Result<Self> {
        fs::create_dir_all(root.join("Captures")).map_err(err)?;
        fs::create_dir_all(root.join("Draft")).map_err(err)?;
        fs::create_dir_all(root.join("Trash")).map_err(err)?;
        Ok(Self { root })
    }
    pub fn draft(&self) -> Result<Draft> {
        let path = self.root.join("draft.json");
        if !path.exists() { return Ok(Draft::default()); }
        let draft: Draft = serde_json::from_slice(&fs::read(path).map_err(err)?).map_err(|e| format!("Draft could not be read; original files preserved: {e}"))?;
        for name in &draft.attachments { safe_name(name)?; }
        Ok(draft)
    }
    pub fn write_draft(&self, draft: &Draft) -> Result<()> { atomic(&self.root.join("draft.json"), &serde_json::to_vec_pretty(draft).map_err(err)?) }
    pub fn update_text(&self, text: String) -> Result<Draft> { let mut d = self.draft()?; d.text = text; self.write_draft(&d)?; Ok(d) }
    pub fn attach(&self, paths: Vec<String>) -> Result<Draft> {
        let mut d = self.draft()?;
        let mut added = Vec::new();
        let result = (|| {
            for path in paths {
                let source = PathBuf::from(path);
                if !source.is_file() { return Err("Choose regular files, not folders".into()); }
                let original = source.file_name().ok_or("Invalid filename")?.to_string_lossy();
                let name = format!("{}_{}", &Uuid::new_v4().to_string()[..8], original);
                safe_name(&name)?;
                let destination = self.root.join("Draft").join(&name);
                fs::copy(source, &destination).map_err(err)?;
                added.push(destination); d.attachments.push(name);
            }
            self.write_draft(&d)
        })();
        if result.is_err() { for path in added { let _ = fs::remove_file(path); } }
        result?; Ok(d)
    }
    pub fn image(&self, data: &str) -> Result<Draft> {
        use base64::Engine;
        let bytes = base64::engine::general_purpose::STANDARD.decode(data).map_err(err)?;
        if bytes.len() > 40 * 1024 * 1024 { return Err("Image exceeds 40 MB".into()); }
        if !bytes.starts_with(b"\x89PNG\r\n\x1a\n") { return Err("Expected PNG image".into()); }
        let name = format!("image-{}.png", Uuid::new_v4());
        let path = self.root.join("Draft").join(&name);
        let mut d = self.draft()?;
        atomic(&path, &bytes)?; d.attachments.push(name);
        if let Err(e) = self.write_draft(&d) { let _ = fs::remove_file(path); return Err(e); } Ok(d)
    }
    pub fn remove_attachment(&self, name: String) -> Result<Draft> {
        safe_name(&name)?; let mut d = self.draft()?;
        d.attachments.retain(|n| n != &name); self.write_draft(&d)?;
        let _ = fs::remove_file(self.root.join("Draft").join(name)); Ok(d)
    }
    pub fn history(&self) -> Result<History> {
        let mut captures = Vec::new(); let mut warnings = Vec::new();
        for entry in fs::read_dir(self.root.join("Captures")).map_err(err)? {
            let path = entry.map_err(err)?.path();
            if path.file_name().unwrap().to_string_lossy().starts_with('.') { continue; }
            let result = (|| -> Result<Capture> {
                let c: Capture = serde_json::from_slice(&fs::read(path.join("capture.json")).map_err(err)?).map_err(err)?;
                safe_name(&c.id)?; for name in &c.attachments { safe_name(name)?; }
                if path.file_name().and_then(|n| n.to_str()) != Some(c.id.as_str()) { return Err("Mismatched capture ID".into()); }
                Ok(c)
            })();
            match result { Ok(c) => captures.push(c), Err(e) => warnings.push(format!("{}: {}", path.display(), e)) }
        }
        captures.sort_by(|a,b| b.created_at.total_cmp(&a.created_at)); Ok(History { captures, warnings })
    }
    pub fn save(&self, text: String) -> Result<Capture> {
        let mut draft = self.draft()?; draft.text = text; self.write_draft(&draft)?;
        if draft.text.trim().is_empty() && draft.attachments.is_empty() { return Err("Add a note or attachment first".into()); }
        let c = Capture { id: Uuid::new_v4().to_string(), created_at: SystemTime::now().duration_since(UNIX_EPOCH).map_err(err)?.as_secs_f64() - SWIFT_EPOCH, text: draft.text, attachments: draft.attachments };
        let temp = self.root.join("Captures").join(format!(".pending-{}", c.id));
        let target = self.root.join("Captures").join(&c.id);
        let result = (|| {
            fs::create_dir_all(temp.join("attachments")).map_err(err)?;
            for name in &c.attachments { safe_name(name)?; fs::copy(self.root.join("Draft").join(name), temp.join("attachments").join(name)).map_err(err)?; }
            atomic(&temp.join("capture.json"), &serde_json::to_vec_pretty(&c).map_err(err)?)?;
            let date = chrono::DateTime::from_timestamp((c.created_at + SWIFT_EPOCH) as i64, 0).ok_or("Invalid timestamp")?.to_rfc3339();
            let links = c.attachments.iter().map(|n| format!("[{}](<attachments/{}>)", n.replace(']', "\\]"), n.replace('%', "%25").replace(' ', "%20").replace('>', "%3E").replace('#', "%23"))).collect::<Vec<_>>().join("\n\n");
            atomic(&temp.join("entry.md"), format!("---\nid: {}\ncreated_at: {}\n---\n\n{}\n\n{}\n", c.id, date, c.text, links).as_bytes())?;
            fs::rename(&temp, &target).map_err(err)?;
            if let Err(e) = self.write_draft(&Draft::default()) { let _ = fs::remove_dir_all(&target); return Err(e); }
            Ok(())
        })();
        if result.is_err() { let _ = fs::remove_dir_all(temp); }
        result?;
        for name in &c.attachments { let _ = fs::remove_file(self.root.join("Draft").join(name)); } Ok(c)
    }
    pub fn delete(&self, id: String) -> Result<()> { safe_name(&id)?; let target=self.root.join("Trash").join(&id); if target.exists(){return Err("A trashed capture already has this ID".into())} fs::rename(self.root.join("Captures").join(id),target).map_err(err) }
    pub fn restore(&self,id:String)->Result<()>{safe_name(&id)?;let target=self.root.join("Captures").join(&id);if target.exists(){return Err("A capture already has this ID".into())}fs::rename(self.root.join("Trash").join(id),target).map_err(err)}
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn deleted_capture_can_be_restored(){
        let root=std::env::temp_dir().join(format!("betterpad-trash-{}",Uuid::new_v4()));
        let store=Store::new(root.clone()).unwrap();
        let capture=store.save("Keep this".into()).unwrap();
        store.delete(capture.id.clone()).unwrap();assert!(store.history().unwrap().captures.is_empty());
        store.restore(capture.id).unwrap();assert_eq!(store.history().unwrap().captures[0].text,"Keep this");
        fs::remove_dir_all(root).unwrap();
    }
    #[test] fn capture_roundtrip_and_failure() {
        let root = std::env::temp_dir().join(format!("betterpad-test-{}", Uuid::new_v4()));
        let s = Store::new(root.clone()).unwrap();
        s.update_text("İstanbul\nexact text".into()).unwrap();
        let input = root.join("original.txt"); fs::write(&input, "bytes").unwrap();
        s.attach(vec![input.to_str().unwrap().into()]).unwrap(); fs::remove_file(input).unwrap();
        let a = s.save(s.draft().unwrap().text).unwrap();
        assert_eq!(s.history().unwrap().captures[0].text, "İstanbul\nexact text");
        assert_eq!(fs::read_to_string(root.join("Captures").join(&a.id).join("attachments").join(&a.attachments[0])).unwrap(), "bytes");
        assert!(s.draft().unwrap().text.is_empty());
        let b = s.save(a.text.clone()).unwrap(); assert_ne!(a.id, b.id);
        s.write_draft(&Draft {text:"keep".into(),attachments:vec!["missing".into()]}).unwrap();
        assert!(s.save("keep".into()).is_err()); assert_eq!(s.draft().unwrap().text,"keep"); assert_eq!(s.history().unwrap().captures.len(),2);
        assert!(s.delete("../Draft".into()).is_err());
        s.delete(a.id).unwrap(); assert_eq!(s.history().unwrap().captures.len(),1);
        fs::remove_dir_all(root).unwrap();
    }
    #[test] fn swift_format() {
        let c: Capture = serde_json::from_str(r#"{"id":"abc","createdAt":816000000.5,"text":"note","attachments":[]}"#).unwrap();
        assert_eq!(c.created_at,816000000.5); assert!(serde_json::to_string(&c).unwrap().contains("createdAt"));
    }
}
