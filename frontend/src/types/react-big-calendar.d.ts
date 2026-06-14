declare module "react-big-calendar" {
  import * as React from "react";

  export interface CalendarProps<T> {
    localizer: object;
    events: Array<{
      id: string;
      title: string;
      start: Date;
      end: Date;
      allDay?: boolean;
      resource?: T;
    }>;
    startAccessor: string;
    endAccessor: string;
    style?: React.CSSProperties;
    view?: "month" | "week" | "work_week" | "day" | "agenda";
    onView?: (view: "month" | "week" | "work_week" | "day" | "agenda") => void;
    date?: Date;
    onNavigate?: (date: Date) => void;
    eventPropGetter?: (event: any) => { style: React.CSSProperties };
    onSelectEvent?: (event: any) => void;
    popup?: boolean;
    selectable?: boolean;
  }

  export const Calendar: React.FC<CalendarProps<any>>;
  export const momentLocalizer: (moment: any) => object;
  export const Views: {
    MONTH: "month";
    WEEK: "week";
    WORK_WEEK: "work_week";
    DAY: "day";
    AGENDA: "agenda";
  };
}