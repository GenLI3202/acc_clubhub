import { render } from "preact";

import { App } from "./app";
import { initialize_live_updates } from "./services/live_update";
import "./styles/tokens.css";
import "./styles/app.css";

const root = document.getElementById("app");
if (!root) {
    throw new Error("Missing app root");
}

render(<App />, root);
void initialize_live_updates();
