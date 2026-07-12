import type { Meta, StoryObj } from '@storybook/react-vite'

import { Card, CardContent } from '@/components/ui/card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'

const slides = [1, 2, 3, 4, 5]

const meta = {
  title: 'UI/Carousel',
  component: Carousel,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
  },
} satisfies Meta<typeof Carousel>

export default meta
type Story = StoryObj<typeof meta>

/** One slide at a time. The arrows sit outside the viewport, so leave room around it. */
export const Default: Story = {
  render: () => (
    <Carousel className="w-64">
      <CarouselContent>
        {slides.map((slide) => (
          <CarouselItem key={slide}>
            <Card>
              <CardContent className="flex aspect-square items-center justify-center">
                <span className="text-4xl font-semibold">{slide}</span>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
}

/** `basis-*` on the items controls how many slides are visible at once. */
export const MultipleItems: Story = {
  render: () => (
    <Carousel opts={{ align: 'start' }} className="w-96">
      <CarouselContent>
        {slides.map((slide) => (
          <CarouselItem key={slide} className="basis-1/3">
            <Card>
              <CardContent className="flex aspect-square items-center justify-center">
                <span className="text-2xl font-semibold">{slide}</span>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
}

/** Scrolls on the y axis; the arrows move above and below the viewport. */
export const Vertical: Story = {
  render: () => (
    <Carousel orientation="vertical" opts={{ align: 'start' }} className="w-64 py-12">
      <CarouselContent className="h-56">
        {slides.map((slide) => (
          <CarouselItem key={slide} className="basis-1/2">
            <Card>
              <CardContent className="flex h-24 items-center justify-center">
                <span className="text-2xl font-semibold">{slide}</span>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
}

/** `opts.loop` lets the last slide wrap around to the first. */
export const Looping: Story = {
  render: () => (
    <Carousel opts={{ loop: true }} className="w-64">
      <CarouselContent>
        {slides.map((slide) => (
          <CarouselItem key={slide}>
            <Card>
              <CardContent className="flex aspect-square items-center justify-center">
                <span className="text-4xl font-semibold">{slide}</span>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
}
