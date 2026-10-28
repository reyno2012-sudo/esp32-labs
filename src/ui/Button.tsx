import type { ComponentProps } from "react";
import styles from "./Button.module.css";

type ButtonProps = Omit<ComponentProps<"button">, "type"> & {
  /** Toggle buttons expose their state to assistive tech and show it filled. */
  pressed?: boolean;
  type?: "button" | "submit";
};

/** The small mono button used by every simulator control. */
export function Button({ pressed, className, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={`${styles.btn} ${className ?? ""}`}
      {...rest}
    />
  );
}

/** A row of controls that wraps on narrow screens. */
export function ButtonRow({ className, ...rest }: ComponentProps<"div">) {
  return <div className={`${styles.row} ${className ?? ""}`} {...rest} />;
}
