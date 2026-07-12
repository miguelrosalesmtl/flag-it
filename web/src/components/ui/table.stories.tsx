import type { Meta, StoryObj } from '@storybook/react-vite'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Invoice = {
  id: string
  customer: string
  status: 'Paid' | 'Pending' | 'Overdue'
  method: string
  amount: number
}

const invoices: Invoice[] = [
  { id: 'INV-001', customer: 'Ada Lovelace', status: 'Paid', method: 'Credit Card', amount: 250 },
  { id: 'INV-002', customer: 'Grace Hopper', status: 'Pending', method: 'PayPal', amount: 150 },
  {
    id: 'INV-003',
    customer: 'Alan Turing',
    status: 'Overdue',
    method: 'Bank Transfer',
    amount: 350,
  },
  {
    id: 'INV-004',
    customer: 'Katherine Johnson',
    status: 'Paid',
    method: 'Credit Card',
    amount: 450,
  },
  {
    id: 'INV-005',
    customer: 'Linus Torvalds',
    status: 'Paid',
    method: 'Bank Transfer',
    amount: 550,
  },
]

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const statusVariant: Record<Invoice['status'], 'default' | 'secondary' | 'destructive'> = {
  Paid: 'default',
  Pending: 'secondary',
  Overdue: 'destructive',
}

const meta = {
  title: 'UI/Table',
  component: Table,
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

/** A recent-invoices table with a caption. */
export const Default: Story = {
  render: () => (
    <Table className="w-[36rem]">
      <TableCaption>A list of your recent invoices.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Invoice</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Method</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="font-medium">{invoice.id}</TableCell>
            <TableCell>{invoice.customer}</TableCell>
            <TableCell>
              <Badge variant={statusVariant[invoice.status]}>{invoice.status}</Badge>
            </TableCell>
            <TableCell>{invoice.method}</TableCell>
            <TableCell className="text-right">{currency.format(invoice.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
}

/** `TableFooter` carries the summary row — here, the invoiced total. */
export const WithFooter: Story = {
  render: () => (
    <Table className="w-[36rem]">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Invoice</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="font-medium">{invoice.id}</TableCell>
            <TableCell>{invoice.customer}</TableCell>
            <TableCell>
              <Badge variant={statusVariant[invoice.status]}>{invoice.status}</Badge>
            </TableCell>
            <TableCell className="text-right">{currency.format(invoice.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Total</TableCell>
          <TableCell className="text-right">
            {currency.format(invoices.reduce((sum, invoice) => sum + invoice.amount, 0))}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
}

/** Rows support a `data-state="selected"` highlight. */
export const SelectedRow: Story = {
  render: () => (
    <Table className="w-[30rem]">
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.slice(0, 4).map((invoice, index) => (
          <TableRow key={invoice.id} data-state={index === 1 ? 'selected' : undefined}>
            <TableCell className="font-medium">{invoice.id}</TableCell>
            <TableCell>{invoice.customer}</TableCell>
            <TableCell className="text-right">{currency.format(invoice.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
}

/** The table container scrolls horizontally when the columns overflow. */
export const Empty: Story = {
  render: () => (
    <Table className="w-[30rem]">
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={3} className="text-muted-foreground h-24 text-center">
            No invoices yet.
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
}
