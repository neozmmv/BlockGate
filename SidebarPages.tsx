import { House, Cog } from "lucide-react";
const default_mr = "mr-4";
const options = [
  // overview page not ready yet
  /* {
    label: "Overview",
    href: "/panel/overview",
    icon: <House className={default_mr} />,
  }, */
  {
    label: "Servers",
    href: "/panel/server",
    icon: <Cog className={default_mr} />,
  },
  {
    label: "General",
    href: "/panel/general",
    icon: <Cog className={default_mr} />,
  },
];

export default options;
