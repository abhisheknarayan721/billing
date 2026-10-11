'use client'

import React, { useActionState, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import PasswordInput from '@/components/form/password-input'

import {
  EMPTY_FORM_STATE,
  RECORD_ID_FIELD,
  type FieldSpec,
  type FormState,
  type FormValues,
  type SelectOption,
} from '@/lib/form/field'

/** An existing row, as the picker lists it and the form fills itself from it. */
export interface EntityRecord {
  id: number
  label: string
  values: FormValues
}

interface EntityFormProps {
  /** Singular name of the thing being edited, e.g. 'Supplier'. Drives the labels. */
  entity: string
  fields: FieldSpec[]
  /** Existing rows, newest state as of this render — picking one loads it. */
  records?: EntityRecord[]
  /**
   * Locks the form to this one row: no picker, always an update. Used by a
   * dedicated edit page, whose action already knows which row it updates.
   */
  record?: EntityRecord
  /** Where the "View all" link in the heading points, e.g. '/purchase/list'. */
  listHref?: string
  /**
   * Replaces the picker: the record being edited is named by this URL search
   * param instead (e.g. `?edit=5`, set by an Edit link in a list on the same
   * page). Cancelling, or a successful update, drops the param so the form
   * goes back to adding.
   */
  editParam?: string
  /**
   * One action for both modes. It decides from the hidden record id whether the
   * submission is an insert or an update, which keeps the form posting to a
   * real server action rather than a client-side branch.
   */
  action: (state: FormState, formData: FormData) => Promise<FormState>
}

/** Ungrouped options first, then one <optgroup> per group, in first-seen order. */
function renderOptions(options: SelectOption[]) {
  const loose = options.filter((option) => option.group === undefined)
  const groups = new Map<string, SelectOption[]>()
  for (const option of options) {
    if (option.group === undefined) continue
    groups.set(option.group, [...(groups.get(option.group) ?? []), option])
  }

  const toOption = (option: SelectOption) => (
    <option key={`${option.group ?? ''}:${option.value}`} value={option.value}>
      {option.label}
    </option>
  )

  return (
    <>
      {loose.map(toOption)}
      {[...groups].map(([group, grouped]) => (
        <optgroup key={group} label={group}>
          {grouped.map(toOption)}
        </optgroup>
      ))}
    </>
  )
}

const inputClass =
  'input'

const EntityForm = ({
  entity,
  fields,
  records = [],
  record,
  listHref,
  editParam,
  action,
}: EntityFormProps) => {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE)
  const [pickedId, setPickedId] = useState('')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selectedId = editParam === undefined ? pickedId : (searchParams.get(editParam) ?? '')

  /** Drops the edit param from the URL, which puts the form back to adding. */
  const clearEditParam = useCallback(() => {
    if (editParam === undefined) return
    const params = new URLSearchParams(searchParams.toString())
    params.delete(editParam)
    const query = params.toString()
    router.replace(query === '' ? pathname : `${pathname}?${query}`, { scroll: false })
  }, [editParam, pathname, router, searchParams])

  const clearSelection = () => (editParam === undefined ? setPickedId('') : clearEditParam())

  // A record can disappear between renders (deleted elsewhere, or the id simply
  // no longer listed), so the selection is only honoured while it resolves —
  // otherwise the form would post an id that no longer exists.
  const editing =
    record ?? records.find((candidate) => String(candidate.id) === selectedId) ?? null
  const recordId = editing === null ? '' : String(editing.id)

  // Keyed on the state object, so this runs once per finished submission:
  // an update picked through the URL is done, and the form returns to adding.
  // The success message lives in the action state, so it stays on screen.
  const lastHandled = useRef(state)
  useEffect(() => {
    if (state === lastHandled.current) return
    lastHandled.current = state
    if (editParam !== undefined && state.status === 'success' && selectedId !== '') {
      clearEditParam()
    }
  }, [state, editParam, selectedId, clearEditParam])

  // An Edit link further down the page loads a record; bring the form into view.
  const sectionRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (editParam !== undefined && selectedId !== '') {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [editParam, selectedId])

  return (
    <section ref={sectionRef} className="page w-full scroll-mt-6">
      <div className="page-header">
        <h2 className="page-title">
          {editing === null ? `Add ${entity}` : `Edit ${entity}`}
        </h2>
        {listHref && (
          <Link href={listHref} className="text-sm link">
            View all
          </Link>
        )}
      </div>

      {record === undefined && editParam === undefined && records.length > 0 && (
        <div className="mb-6">
          <label
            htmlFor="entity-picker"
            className="label"
          >
            Edit existing
          </label>
          <select
            id="entity-picker"
            value={recordId}
            onChange={(event) => setPickedId(event.target.value)}
            disabled={pending}
            className={inputClass}
          >
            <option value="">- new {entity.toLowerCase()} -</option>
            {records.map((record) => (
              <option key={record.id} value={record.id}>
                {record.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Pick one to change it, or leave this on{' '}
            <span className="whitespace-nowrap">- new {entity.toLowerCase()} -</span> to
            add another.
          </p>
        </div>
      )}

      {state.message && (
        <p
          role="status"
          className={`mb-6 ${
            state.status === 'success'
              ? 'alert-success'
              : 'alert-error'
          }`}
        >
          {state.message}
        </p>
      )}

      {/*
        The inputs are uncontrolled, so remounting is what reloads them: on a
        successful save (clearing them, or showing the saved row back) and on
        every change of selection (swapping one record's values for another's).
      */}
      <form
        key={`${recordId}:${state.status === 'success' ? state.message : 'editing'}`}
        action={formAction}
        noValidate
        className="card grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2 sm:p-6"
      >
        <input type="hidden" name={RECORD_ID_FIELD} value={recordId} readOnly />

        {fields.map((field) => {
          const error = state.errors[field.name]
          const errorId = `${field.name}-error`
          // A rejected submission wins, so nothing typed is lost; otherwise the
          // picked record, and only then the field's own default.
          const defaultValue =
            state.values[field.name] ??
            editing?.values[field.name] ??
            field.defaultValue ??
            ''

          // Phone numbers and fixed-length codes (a PIN) take digits only.
          const digits = field.type === 'tel' ? 10 : field.digits

          const shared = {
            id: field.name,
            name: field.name,
            defaultValue,
            disabled: pending,
            'aria-invalid': error ? true : undefined,
            'aria-describedby': error ? errorId : undefined,
            className: inputClass,
          }

          return (
            <div key={field.name} className={field.wide ? 'sm:col-span-2' : undefined}>
              <label
                htmlFor={field.name}
                className="label"
              >
                {field.label}
                {field.required && <span className="ml-0.5 text-red-600">*</span>}
              </label>

              {field.type === 'textarea' ? (
                <textarea {...shared} rows={3} />
              ) : field.type === 'password' ? (
                <PasswordInput
                  {...shared}
                  maxLength={field.maxLength}
                  autoComplete={field.autoComplete}
                />
              ) : field.type === 'select' ? (
                <select {...shared}>
                  <option value="">- select -</option>
                  {renderOptions(field.options ?? [])}
                </select>
              ) : (
                <input
                  {...shared}
                  type={field.type}
                  maxLength={field.maxLength}
                  step={field.step}
                  min={field.numeric?.min}
                  pattern={digits === undefined ? undefined : `\\d{${digits}}`}
                  inputMode={digits === undefined ? undefined : 'numeric'}
                  // Drops letters and symbols as they are typed or pasted.
                  onInput={
                    digits !== undefined
                      ? (event) => {
                          const input = event.currentTarget
                          input.value = input.value.replace(/\D/g, '')
                        }
                      : undefined
                  }
                  autoComplete={field.autoComplete}
                />
              )}

              {error && (
                <p id={errorId} className="mt-1 text-xs text-red-600">
                  {error}
                </p>
              )}
            </div>
          )
        })}

        <div className="flex items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="btn-primary"
          >
            {pending
              ? 'Saving...'
              : editing === null
                ? `Save ${entity}`
                : `Update ${entity}`}
          </button>
          {record !== undefined && listHref && (
            <Link href={listHref} className="text-sm text-slate-600 hover:underline">
              Cancel
            </Link>
          )}
          {record === undefined && editing !== null && (
            <button
              type="button"
              onClick={clearSelection}
              disabled={pending}
              className="text-sm text-slate-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  )
}

export default EntityForm
