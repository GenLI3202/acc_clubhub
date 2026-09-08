import { render } from "preact";

import { App } from "./app";
import "./styles/tokens.css";
import "./styles/app.css";

const root = document.getElementById("app");
if (!root) {
    throw new Error("Missing app root");
}

render(<App />, root);
