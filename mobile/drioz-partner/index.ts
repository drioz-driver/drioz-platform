import { registerRootComponent } from "expo";
// Background location task must be defined at module scope before the app renders.
import "./src/location";
import App from "./App";
registerRootComponent(App);
