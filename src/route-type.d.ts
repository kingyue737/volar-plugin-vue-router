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
  /**
   * Name for the route record.
   */
  name?: string;
  /**
   * Where to redirect if the route is directly matched. The redirection happens
   * before any navigation guard and triggers a new navigation with the new
   * target location.
   */
  redirect?: string;
}
