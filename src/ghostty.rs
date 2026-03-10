// Ghostty FFI - placeholder for future integration
// For now, we're using alacritty_terminal which is pure Rust

pub mod ffi {
    // Placeholder Ghostty bindings
    // When Ghostty's C API stabilizes, we can implement full bindings here
}

// Re-export alacritty_terminal as our terminal backend for now
pub use alacritty_terminal as backend;
