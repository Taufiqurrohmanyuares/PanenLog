"use client";

import { useState } from "react";

export function PasswordField({
  id,
  name,
  autoComplete,
  invalid,
}: {
  id: string;
  name: string;
  autoComplete: string;
  invalid?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw">
      <input
        className={"tx" + (invalid ? " er" : "")}
        id={id}
        name={name}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
      />
      <button type="button" className="eye" onClick={() => setShow((v) => !v)}>
        {show ? "Sembunyi" : "Lihat"}
      </button>
    </div>
  );
}
