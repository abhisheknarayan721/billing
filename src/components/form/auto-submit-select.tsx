'use client'

import type { ComponentProps } from 'react'

/**
 * A <select> that submits its form as soon as it changes, for choices like a
 * sort order that should apply without a separate button press.
 */
const AutoSubmitSelect = (props: Omit<ComponentProps<'select'>, 'onChange'>) => (
  <select {...props} onChange={(event) => event.currentTarget.form?.requestSubmit()} />
)

export default AutoSubmitSelect
