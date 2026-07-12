import type { Meta, StoryObj } from '@storybook/react-vite'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from 'recharts'

import type { ChartConfig } from '@/components/ui/chart'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

const data = [
  { month: 'January', desktop: 186, mobile: 80 },
  { month: 'February', desktop: 305, mobile: 200 },
  { month: 'March', desktop: 237, mobile: 120 },
  { month: 'April', desktop: 173, mobile: 190 },
  { month: 'May', desktop: 209, mobile: 130 },
  { month: 'June', desktop: 264, mobile: 140 },
]

/**
 * The config keys must match the `dataKey` of each series. Every key gets a
 * `--color-<key>` CSS variable injected by `ChartContainer`, which is what the
 * series below reference as `fill` / `stroke`.
 */
const chartConfig = {
  desktop: {
    label: 'Desktop',
    theme: { light: 'oklch(0.55 0.16 255)', dark: 'oklch(0.72 0.13 255)' },
  },
  mobile: {
    label: 'Mobile',
    theme: { light: 'oklch(0.6 0.14 160)', dark: 'oklch(0.76 0.12 160)' },
  },
} satisfies ChartConfig

const axis = (
  <XAxis
    dataKey="month"
    tickLine={false}
    axisLine={false}
    tickMargin={8}
    tickFormatter={(value) => String(value).slice(0, 3)}
  />
)

const barChart = (
  <BarChart accessibilityLayer data={data}>
    <CartesianGrid vertical={false} />
    {axis}
    <ChartTooltip content={<ChartTooltipContent />} />
    <ChartLegend content={<ChartLegendContent />} />
    <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
    <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
  </BarChart>
)

const meta = {
  title: 'UI/Chart',
  component: ChartContainer,
  args: {
    config: chartConfig,
    children: barChart,
  },
  decorators: [
    (Story) => (
      <div className="w-[520px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChartContainer>

export default meta
type Story = StoryObj<typeof meta>

/** Grouped bars with a tooltip and a legend. */
export const Bars: Story = {}

/** A single series, stacked by passing the same `stackId` to each bar. */
export const StackedBars: Story = {
  args: {
    children: (
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        {axis}
        <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
        <Bar dataKey="desktop" stackId="a" fill="var(--color-desktop)" radius={[0, 0, 4, 4]} />
        <Bar dataKey="mobile" stackId="a" fill="var(--color-mobile)" radius={[4, 4, 0, 0]} />
      </BarChart>
    ),
  },
}

export const Lines: Story = {
  args: {
    children: (
      <LineChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        {axis}
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line dataKey="desktop" type="monotone" stroke="var(--color-desktop)" strokeWidth={2} />
        <Line dataKey="mobile" type="monotone" stroke="var(--color-mobile)" strokeWidth={2} />
      </LineChart>
    ),
  },
}

/** `hideLabel` drops the tooltip heading — useful when the x axis already says it. */
export const AreaSeries: Story = {
  args: {
    children: (
      <AreaChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        {axis}
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Area
          dataKey="desktop"
          type="natural"
          stroke="var(--color-desktop)"
          fill="var(--color-desktop)"
          fillOpacity={0.3}
        />
      </AreaChart>
    ),
  },
}
