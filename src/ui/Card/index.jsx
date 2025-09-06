"use client";
import "./Card.scss";

const Card = ({ children, className }) => {
  return (
    <div className={`rounded-md bg-foreground-100/60 dark:bg-foreground-300/50 p-5 ${className}`}>{children}</div>
  );
};

export default Card;
