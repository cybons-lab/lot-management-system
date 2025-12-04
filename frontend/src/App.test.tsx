import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

describe('App', () => {
    it('renders without crashing', () => {
        render(<div>Hello Vitest</div>)
        expect(screen.getByText('Hello Vitest')).toBeInTheDocument()
    })
})
