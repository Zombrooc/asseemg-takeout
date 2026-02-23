use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;
use uuid::Uuid;

#[derive(Clone)]
pub struct WsRegistry(Arc<Mutex<HashMap<String, HashMap<Uuid, mpsc::UnboundedSender<String>>>>>);

impl WsRegistry {
  pub fn new() -> Self {
    Self(Arc::new(Mutex::new(HashMap::new())))
  }

  pub fn register(&self, event_id: String) -> (Uuid, mpsc::UnboundedReceiver<String>) {
    let id = Uuid::new_v4();
    let (tx, rx) = mpsc::unbounded_channel();
    let mut g = self.0.lock().unwrap();
    g.entry(event_id).or_default().insert(id, tx);
    (id, rx)
  }

  pub fn unregister(&self, event_id: &str, id: Uuid) {
    let mut g = self.0.lock().unwrap();
    if let Some(map) = g.get_mut(event_id) {
      map.remove(&id);
      if map.is_empty() {
        g.remove(event_id);
      }
    }
  }

  pub fn broadcast(&self, event_id: &str, msg: &str) {
    let mut g = self.0.lock().unwrap();
    if let Some(senders) = g.get_mut(event_id) {
      senders.retain(|_, s| s.send(msg.to_string()).is_ok());
    }
  }
}
