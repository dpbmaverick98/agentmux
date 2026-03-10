// Placeholder build script
// Ghostty integration is for future use - currently using portable-pty

fn main() {
    // Don't link ghostty for now since we haven't built it
    // When we integrate Ghostty properly, uncomment:
    // println!("cargo:rustc-link-lib=ghostty");
    // println!("cargo:rustc-link-search=native=/usr/local/lib");
}
