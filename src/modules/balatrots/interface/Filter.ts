import type { Run } from "./Run";

export class Filter {

    filter(_run: Run): boolean {
        return true;
    }
}