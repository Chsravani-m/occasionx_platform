export const getDashboardRoute = (
  role?: string
) => {

  switch (role) {

    case "ADMIN":
      return "/admin/dashboard";

    case "PROVIDER":
      return "/provider/dashboard";

    case "CUSTOMER":
      return "/";

    default:
      return "/";
  }
};