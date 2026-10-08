// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TutorialDialog } from './TutorialDialog'
import { TUTORIAL_STEPS } from './steps'

afterEach(cleanup)

const title = () => screen.getByRole('heading', { level: 2 })
const button = (name: string) => screen.getByRole('button', { name })

describe('TutorialDialog', () => {
  it('è un dialogo modale con titolo, testo e avanzamento', () => {
    render(<TutorialDialog onFinish={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-labelledby')).toBe(title().id)
    expect(title().textContent).toBe(TUTORIAL_STEPS[0].title)
    expect(screen.getByText(`1 di ${TUTORIAL_STEPS.length}`)).toBeTruthy()
    expect(document.activeElement).toBe(title())
  })

  it('Avanti e Indietro scorrono i passi; all’ultimo compare "Inizia"', () => {
    const onFinish = vi.fn()
    render(<TutorialDialog onFinish={onFinish} />)
    expect((button('Indietro') as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(button('Avanti'))
    expect(title().textContent).toBe(TUTORIAL_STEPS[1].title)
    expect(screen.getByText(`2 di ${TUTORIAL_STEPS.length}`)).toBeTruthy()
    expect(document.activeElement).toBe(title())
    fireEvent.click(button('Indietro'))
    expect(title().textContent).toBe(TUTORIAL_STEPS[0].title)

    for (let i = 1; i < TUTORIAL_STEPS.length; i++) fireEvent.click(button('Avanti'))
    expect(title().textContent).toBe(TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1].title)
    expect(screen.queryByRole('button', { name: 'Avanti' })).toBeNull()
    fireEvent.click(button('Inizia'))
    expect(onFinish).toHaveBeenCalledWith(true)
  })

  it('"Salta tutorial" ed Esc chiudono come saltato', () => {
    const onFinish = vi.fn()
    render(<TutorialDialog onFinish={onFinish} />)
    fireEvent.click(button('Salta tutorial'))
    expect(onFinish).toHaveBeenLastCalledWith(false)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onFinish).toHaveBeenCalledTimes(2)
    expect(onFinish).toHaveBeenLastCalledWith(false)
  })

  it('Tab resta dentro il dialogo', () => {
    render(<TutorialDialog onFinish={vi.fn()} />)
    fireEvent.click(button('Avanti'))
    const skip = button('Salta tutorial')
    const next = button('Avanti')
    next.focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(document.activeElement).toBe(skip)
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(next)
  })

  it('al massimo 7 passi, ognuno con 1-3 frasi', () => {
    expect(TUTORIAL_STEPS.length).toBeLessThanOrEqual(7)
    for (const s of TUTORIAL_STEPS) {
      expect(s.title).toBeTruthy()
      expect(s.body.length).toBeGreaterThanOrEqual(1)
      expect(s.body.length).toBeLessThanOrEqual(3)
    }
  })

  it('restituisce il focus alla chiusura', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const { unmount } = render(<TutorialDialog onFinish={vi.fn()} />)
    expect(document.activeElement).not.toBe(opener)
    unmount()
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })
})
