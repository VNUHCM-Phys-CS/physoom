"use client";
import "./Card.scss";

const Card = ({ children, className, id, style }) => {
  return (
    <div id={id} style={style} className={`rounded-md bg-foreground-100/60 dark:bg-foreground-300/50 p-5 ${className}`}>{children}</div>
  );
};

export default Card;
