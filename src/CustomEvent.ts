// compatibility for CustomEvent in Node 16 and 18
// todo should be removed in 2026 ...
// https://stackoverflow.com/questions/69791262/how-do-i-send-a-customevent-via-a-node-16-eventtarget

export class CustomEvent<T> extends Event {
  detail: T;
  constructor(message: string, data: EventInit & { detail: T }) {
    super(message, data);
    this.detail = data.detail;
  }
}
