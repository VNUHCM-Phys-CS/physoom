"use client";
import "./Card.css";

const Card = ({ children, className }) => {
  return (
    <div className={`rounded-md bg-slate-50 p-5 ${className}`}>{children}</div>
  );
};

export default Card;
