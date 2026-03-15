import { Fragment } from "react";

import type { LinkedPerson } from "@/lib/preview";

export function PeoplePreview({
  people,
  emptyLabel,
}: {
  people: LinkedPerson[];
  emptyLabel: string;
}) {
  if (!people.length) {
    return <span className="text-slate-400">{emptyLabel}</span>;
  }

  return (
    <>
      {people.map((person, index) => (
        <Fragment key={`${person.fullName}-${index}`}>
          {index > 0 ? ", " : null}
          {person.url ? (
            <a
              href={person.url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-3"
            >
              {person.fullName}
            </a>
          ) : (
            <span className="font-medium text-slate-700">{person.fullName}</span>
          )}
        </Fragment>
      ))}
    </>
  );
}
