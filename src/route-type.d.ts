import type { RouteRecordRaw } from "vue-router";

export interface CustomRouteBlock
  extends Partial<
    Omit<
      RouteRecordRaw,
      | "components"
      | "component"
      | "children"
      | "beforeEnter"
      | "name"
      | "redirect"
      | "props"
    >
  > {
  name?: string;
  redirect?: string;
}
