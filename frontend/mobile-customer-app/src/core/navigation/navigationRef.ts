import { createNavigationContainerRef } from "@react-navigation/native";
import type { CustomerStackParamList } from "./types";

// AppHeader/AppFooter render as siblings of the Stack.Navigator (outside
// any Screen), so they can't use the useNavigation() hook - it only
// works for components mounted inside a navigator's screen tree. This
// ref lets them navigate/go back imperatively from anywhere, as long as
// the container has finished mounting (isReady()).
export const navigationRef = createNavigationContainerRef<CustomerStackParamList>();

export function navigateTo<RouteName extends keyof CustomerStackParamList>(
  name: RouteName,
  params: CustomerStackParamList[RouteName]
) {
  if (!navigationRef.isReady()) return;
  // @ts-expect-error - react-navigation's overload resolution for a
  // generic RouteName doesn't narrow cleanly here; the call itself is
  // sound since RouteName/params come from the same param list.
  navigationRef.navigate(name, params);
}

export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}
