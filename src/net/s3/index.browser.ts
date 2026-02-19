import { BrowserS3Client } from "./browser-client";

export default function create() {
    return new BrowserS3Client();
}
