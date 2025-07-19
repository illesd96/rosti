"use client"

import { useParams, usePathname } from "next/navigation"
import { twMerge } from "tailwind-merge"
import { Layout, LayoutColumn } from "@/components/Layout"
import { LocalizedLink } from "@/components/LocalizedLink"

export const Footer: React.FC = () => {
  const pathName = usePathname()
  const { countryCode } = useParams()
  const currentPath = pathName.split(`/${countryCode}`)[1]

  const isAuthPage = currentPath === "/register" || currentPath === "/login"

  return (
    <div
      className={twMerge(
        "bg-grayscale-50 py-8 md:py-20",
        isAuthPage && "hidden"
      )}
    >
      <Layout>
        <LayoutColumn className="col-span-13">
          <div className="flex max-lg:flex-col justify-between md:gap-20 max-md:px-4">
            <div className="max-w-35 md:flex-1 max-md:mb-9">
              <h1 className="text-lg md:text-xl mb-2 md:mb-6 leading-none md:leading-[0.9]">
                Sofa Society Co.
              </h1>
              <p className="text-xs">
                &copy; {new Date().getFullYear()}, Rosti
              </p>
            </div>
            <div className="flex gap-10 xl:gap-18 max-md:text-xs flex-1 justify-between lg:justify-center">
              <ul className="flex flex-col gap-6 md:gap-3.5">
                <li>
                  <LocalizedLink href="/privacy-policy">
                    Privacy Policy
                  </LocalizedLink>
                </li>
                <li>
                  <LocalizedLink href="/cookie-policy">
                    Cookie Policy
                  </LocalizedLink>
                </li>
                <li>
                  <LocalizedLink href="/terms-of-use">
                    Terms of Use
                  </LocalizedLink>
                </li>
              </ul>
            </div>
          </div>
        </LayoutColumn>
      </Layout>
    </div>
  )
}
