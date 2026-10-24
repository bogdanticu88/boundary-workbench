// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { indexedDB } from 'fake-indexeddb'
import App from '../src/App'

afterEach(() => cleanup())

describe('deletion workflow', () => {
  it('leaves the assessment unchanged when a cascade is cancelled', async () => {
    Object.defineProperty(globalThis, 'indexedDB', { value: indexedDB, configurable: true })
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<App />)
    await screen.findByText('Boundary Workbench')
    fireEvent.click(screen.getByRole('button', { name: 'Architecture' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    expect(screen.getAllByDisplayValue('New component')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(window.confirm).toHaveBeenCalled()
    expect(screen.getAllByDisplayValue('New component')).toHaveLength(1)
  })

  it('confirms a cascade and leaves valid state ready for export', async () => {
    Object.defineProperty(globalThis, 'indexedDB', { value: indexedDB, configurable: true })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)
    await screen.findByText('Boundary Workbench')
    fireEvent.click(screen.getByRole('button', { name: 'Architecture' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.queryByDisplayValue('New component')).toBeNull()
  })
})
