pub mod api;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      let pool = match app.handle().path().app_data_dir() {
        Ok(dir) => {
          let dir: std::path::PathBuf = dir;
          std::fs::create_dir_all(&dir).ok();
          api::db::DbPool::open(dir.join("takeout.db")).unwrap_or_else(|_| {
            api::db::DbPool::open_in_memory().expect("in-memory db")
          })
        }
        _ => api::db::DbPool::open_in_memory().expect("in-memory db"),
      };
      let state = api::handlers::AppState {
        pool: std::sync::Arc::new(pool),
        base_url: "http://127.0.0.1:5555".to_string(),
      };
      let router = api::handlers::router(state);
      std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().expect("tokio runtime");
        rt.block_on(async {
          let listener = tokio::net::TcpListener::bind("0.0.0.0:5555").await.expect("bind 5555");
          axum::serve(listener, router).await.expect("serve");
        });
      });
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
