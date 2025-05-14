import {BrowserS3Client} from "./browser-client";
import {NodeS3Client} from "./node-client";

export default function create(){
    if (typeof window !== "undefined") {
        return new BrowserS3Client();
    } else {
        return new NodeS3Client();
    }
}