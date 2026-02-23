pub mod api;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if let Some(window) = app.get_webview_window("main") {
        let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/_source-desktop.png"))?;
        window.set_icon(icon)?;
      }

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
      let base_url = local_ip_address::local_ip()
        .map(|ip| format!("http://{}:5555", ip))
        .unwrap_or_else(|_| "http://127.0.0.1:5555".to_string());
      let state = api::handlers::AppState {
        pool: std::sync::Arc::new(pool),
        base_url,
        ws_registry: std::sync::Arc::new(api::ws::WsRegistry::new()),
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
