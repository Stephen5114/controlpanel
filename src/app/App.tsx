import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { LocalizationProvider } from "./lib/i18n";
import { ThemeProvider } from "./lib/theme";

export function App() {
  return (
    <LocalizationProvider>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </LocalizationProvider>
  );
}

export default App;
