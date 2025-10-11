"use client";

import { useAppDispatch, useAppSelector } from "../../lib/hooks";
import type { RootState } from "../../lib/store";
import { Menu, Transition } from "@headlessui/react";
import Link from "next/link";
import { loggedIn, logout } from "../../lib/slices/authSlice";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { Shield } from "lucide-react";
import { usePathname } from "next/navigation";

const navigation = [{ name: "Settings", to: "/settings" }];
const redirectRoute = "/";

const renderNavLinks = () => {
  return navigation.map((nav) => (
    <Menu.Item key={nav.name}>
      {({ active }) => (
        <Link
          href={nav.to}
          key={nav.name}
          className={[
            active ? "bg-gray-100 cursor-pointer" : "",
            "block px-4 py-2 text-sm text-gray-700 cursor-pointer",
          ].join(" ")}
        >
          {nav.name}
        </Link>
      )}
    </Menu.Item>
  ));
};

const renderUser = (loggedIn: boolean, pathname: string, router: any) => {
  if (!loggedIn) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant={pathname === "/login" ? "default" : "outline"}
          size="sm"
          onClick={() => router.push("/login")}
        >
          <Shield className="h-4 w-4 mr-2" />
          Admin Login
        </Button>
      </div>
    );
  } else {
    return (
      <Menu.Button className="flex rounded-full bg-white text-sm focus:outline-none">
        <Button
          variant={pathname === "/login" ? "default" : "outline"}
          size="sm"
          onClick={() => router.push("/login")}
        >
          <Shield className="h-4 w-4 mr-2" />
          Admin Menu
        </Button>
      </Menu.Button>
    );
  }
};

export default function AuthenticationNavigation() {
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector((state: RootState) => loggedIn(state));
  const router = useRouter();
  const pathname = usePathname();
  const logoutUser = () => {
    dispatch(logout());
    router.push(redirectRoute);
  };

  return (
    <Menu as="div" className="z-10 relative ml-3">
      {renderUser(isLoggedIn, pathname, router)}
      <Transition
        enter="transition ease-out duration-200"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {renderNavLinks()}
          <Menu.Item>
            {({ active }) => (
              <a
                className={[
                  active ? "bg-gray-100 cursor-pointer" : "",
                  "block px-4 py-2 text-sm text-gray-700 cursor-pointer",
                ].join(" ")}
                onClick={() => logoutUser()}
              >
                Logout
              </a>
            )}
          </Menu.Item>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
