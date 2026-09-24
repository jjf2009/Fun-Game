// Shared input state. The on-screen joystick/button (UIScene) writes here,
// and GameScene reads it together with the keyboard.
export const input = {
  x: 0,
  y: 0,
  _action: false,
  queueAction() { this._action = true; },
  consumeAction() {
    const a = this._action;
    this._action = false;
    return a;
  },
  reset() {
    this.x = 0;
    this.y = 0;
    this._action = false;
  },
};
