/** Inline script that applies the persisted theme before paint, avoiding a flash of the wrong theme. */
export function ThemeInitScript() {
  const code = `
    (function () {
      try {
        var stored = localStorage.getItem("gecodis-ui");
        var theme = "dark";
        if (stored) {
          var parsed = JSON.parse(stored);
          theme = (parsed.state && parsed.state.theme) || "dark";
        }
        document.documentElement.classList.toggle("dark", theme === "dark");
      } catch (e) {
        document.documentElement.classList.add("dark");
      }
    })();
  `;
  // eslint-disable-next-line react/no-danger
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
