import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { DateRange } from 'react-day-picker'

import { Calendar } from '@/components/ui/calendar'

const meta = {
  title: 'UI/Calendar',
  component: Calendar,
} satisfies Meta<typeof Calendar>

export default meta
type Story = StoryObj<typeof meta>

/** A single-date picker. `selected` / `onSelect` are controlled by the consumer. */
function SingleCalendar() {
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 6, 12))

  return (
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      defaultMonth={new Date(2026, 6, 1)}
      className="rounded-md border shadow-sm"
    />
  )
}

/** Two months side by side, selecting a start/end range. */
function RangeCalendar() {
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(2026, 6, 8),
    to: new Date(2026, 6, 16),
  })

  return (
    <Calendar
      mode="range"
      selected={range}
      onSelect={setRange}
      defaultMonth={new Date(2026, 6, 1)}
      numberOfMonths={2}
      className="rounded-md border shadow-sm"
    />
  )
}

/** Month and year dropdowns instead of a static caption label. */
function DropdownCalendar() {
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 6, 12))

  return (
    <Calendar
      mode="single"
      captionLayout="dropdown"
      startMonth={new Date(2020, 0)}
      endMonth={new Date(2030, 11)}
      selected={date}
      onSelect={setDate}
      defaultMonth={new Date(2026, 6, 1)}
      className="rounded-md border shadow-sm"
    />
  )
}

export const Single: Story = {
  render: () => <SingleCalendar />,
}

export const Range: Story = {
  render: () => <RangeCalendar />,
}

export const WithDropdownCaption: Story = {
  render: () => <DropdownCalendar />,
}

/** Weekends are disabled and past days are unreachable. */
export const WithDisabledDays: Story = {
  render: () => (
    <Calendar
      mode="single"
      defaultMonth={new Date(2026, 6, 1)}
      disabled={[{ dayOfWeek: [0, 6] }, { before: new Date(2026, 6, 6) }]}
      showWeekNumber
      className="rounded-md border shadow-sm"
    />
  ),
}
