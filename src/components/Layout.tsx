import dynamic from "next/dynamic";
import React from "react";
import { Wrapper, WrapperVariant } from "./Wrapper";

interface LayoutProps {
  children: React.ReactNode;
  variant?: WrapperVariant;
}

const AvoidSSRNavBar = dynamic(() => import("./NavBar").then(modules => modules.NavBar), {ssr: false});

export const Layout: React.FC<LayoutProps> = ({ children, variant }) => {
  return (
    <>
    <AvoidSSRNavBar />
      {/* <NavBar /> */}
      <Wrapper variant={variant}>{children}</Wrapper>
    </>
  );
};
