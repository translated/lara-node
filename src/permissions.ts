/** Resource permissions in read, write, export, share order; `-` means absent. */
export type PermissionMask = "r---" | "rw--" | "r-e-" | "r--s" | "rwe-" | "rw-s" | "r-es" | "rwes";
