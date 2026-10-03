/** Array-backed binary min-heap. Lower `priority` number pops first (0 =
 * highest priority), matching how every other priority convention in this
 * codebase already reads ("P0" above P1/P2). O(log n) push/pop, O(1) peek. */
export class PriorityQueue<T> {
  private heap: Array<{ priority: number; value: T }> = [];

  get size(): number {
    return this.heap.length;
  }

  peek(): T | undefined {
    return this.heap[0]?.value;
  }

  push(value: T, priority: number): void {
    this.heap.push({ priority, value });
    let i = this.heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[parent].priority <= this.heap[i].priority) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      let i = 0;
      const n = this.heap.length;
      for (;;) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let smallest = i;
        if (left < n && this.heap[left].priority < this.heap[smallest].priority) smallest = left;
        if (right < n && this.heap[right].priority < this.heap[smallest].priority) smallest = right;
        if (smallest === i) break;
        [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
        i = smallest;
      }
    }
    return top.value;
  }
}

/* Smallest possible self-check: run with `npx tsx priorityQueue.ts` or import
 * `demo()` from a scratch script. Not wired into any test runner — this repo
 * doesn't have one configured for apps/web/console yet. */
export function demo(): void {
  const q = new PriorityQueue<string>();
  q.push("low", 2);
  q.push("high", 0);
  q.push("mid", 1);
  const order = [q.pop(), q.pop(), q.pop()];
  if (order.join(",") !== "high,mid,low") {
    throw new Error(`PriorityQueue ordering broken: got ${order.join(",")}`);
  }
}
