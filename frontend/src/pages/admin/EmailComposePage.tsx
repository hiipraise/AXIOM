import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { emailApi } from '../../api'
import { Send, Mail, Users, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmDialog from '../../components/UI/ConfirmDialog'

type Mode = 'single' | 'batch'
import Seo from "../../components/Seo";

export default function EmailComposePage() {
  const [mode, setMode] = useState<Mode>('single')
  const [to, setTo] = useState('')
  const [toList, setToList] = useState('')
  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')
  const [templateKey, setTemplateKey] = useState('')
  const [batchSize, setBatchSize] = useState(50)
  const [batchInterval, setBatchInterval] = useState(15)

  const sendSingle = useMutation({
    mutationFn: () => {
      const recipients = to.split(/[,;\s]+/).map(e => e.trim()).filter(Boolean)
      if (recipients.length === 0) throw new Error('No recipients')
      return emailApi.send({
        to: recipients.length === 1 ? recipients[0] : recipients,
        subject,
        html: html || undefined,
        template_key: templateKey || undefined,
      })
    },
    onSuccess: () => {
      toast.success('Email sent successfully')
      setTo('')
      setSubject('')
      setHtml('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const sendBatch = useMutation({
    mutationFn: () => {
      const recipients = toList.split(/[,;\n]+/).map(e => e.trim()).filter(Boolean)
      if (recipients.length === 0) throw new Error('No recipients')
      return emailApi.sendBatch({
        to: recipients,
        subject,
        html: html || undefined,
        template_key: templateKey || undefined,
        batch_size: batchSize,
        batch_interval_minutes: batchInterval,
      })
    },
    onSuccess: (res) => {
      toast.success(res.message)
      setToList('')
      setSubject('')
      setHtml('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const [showConfirm, setShowConfirm] = useState(false)
  const isPending = sendSingle.isPending || sendBatch.isPending
  const recipientCount = mode === 'single'
    ? to.split(/[,;\s]+/).filter(Boolean).length
    : toList.split(/[,;\n]+/).filter(Boolean).length

  const handleSend = () => {
    if (recipientCount > 10 || mode === 'batch') {
      setShowConfirm(true)
    } else {
      mode === 'single' ? sendSingle.mutate() : sendBatch.mutate()
    }
  }

  const confirmSend = () => {
    setShowConfirm(false)
    mode === 'single' ? sendSingle.mutate() : sendBatch.mutate()
  }

  const confirmDescription = mode === 'single'
    ? `Send to ${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}?`
    : `Start batch send to ${recipientCount} recipients (${batchSize} per batch, ${batchInterval} min apart)?`

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-2xl">
      <Seo title="Send Email — Admin" noindex />
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-ink">Send Email</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          Compose and send emails via Sendhiiv.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('single')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${
            mode === 'single'
              ? 'border-ink bg-ink text-white'
              : 'border-ash-border text-ink-muted hover:bg-ash'
          }`}
        >
          <Mail size={16} />
          Single / Multiple
        </button>
        <button
          onClick={() => setMode('batch')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${
            mode === 'batch'
              ? 'border-ink bg-ink text-white'
              : 'border-ash-border text-ink-muted hover:bg-ash'
          }`}
        >
          <Users size={16} />
          Batch (Drip)
        </button>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-ash-border p-5 space-y-4">
        {/* Recipients */}
        <div>
          <label className="label">
            To {mode === 'batch' ? '(one per line)' : '(comma-separated)'}
          </label>
          {mode === 'single' ? (
            <input
              type="text"
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="alice@example.com, bob@example.com"
              className="w-full px-3 py-2 text-sm border border-ash-border rounded-lg focus:outline-none focus:border-ink"
            />
          ) : (
            <textarea
              value={toList}
              onChange={e => setToList(e.target.value)}
              rows={4}
              placeholder="alice@example.com&#10;bob@example.com&#10;charlie@example.com"
              className="w-full px-3 py-2 text-sm border border-ash-border rounded-lg focus:outline-none focus:border-ink resize-none font-mono"
            />
          )}
          {recipientCount > 0 && (
            <p className="text-xs text-ink-muted mt-1">
              {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Subject */}
        <div>
          <label className="label">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Email subject line"
            className="w-full px-3 py-2 text-sm border border-ash-border rounded-lg focus:outline-none focus:border-ink"
          />
        </div>

        {/* Template key */}
        <div>
          <label className="label">Template Key (optional)</label>
          <input
            type="text"
            value={templateKey}
            onChange={e => setTemplateKey(e.target.value)}
            placeholder="e.g. brand-layout, welcome-offer"
            className="w-full px-3 py-2 text-sm border border-ash-border rounded-lg focus:outline-none focus:border-ink"
          />
          <p className="text-[11px] text-ink-muted mt-1">
            Leave empty to send raw HTML, or specify a template key.
          </p>
        </div>

        {/* HTML body */}
        <div>
          <label className="label">HTML Body</label>
          <textarea
            value={html}
            onChange={e => setHtml(e.target.value)}
            rows={8}
            placeholder={templateKey ? '<p>Hi {{firstName}}, your account is ready.</p>' : '<p>Your message here...</p>'}
            className="w-full px-3 py-2 text-sm border border-ash-border rounded-lg focus:outline-none focus:border-ink resize-none font-mono"
          />
        </div>

        {/* Batch options */}
        {mode === 'batch' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Batch Size</label>
              <input
                type="number"
                value={batchSize}
                onChange={e => setBatchSize(Number(e.target.value))}
                min={1}
                max={500}
                className="w-full px-3 py-2 text-sm border border-ash-border rounded-lg focus:outline-none focus:border-ink"
              />
            </div>
            <div>
              <label className="label">Interval (minutes)</label>
              <input
                type="number"
                value={batchInterval}
                onChange={e => setBatchInterval(Number(e.target.value))}
                min={1}
                max={1440}
                className="w-full px-3 py-2 text-sm border border-ash-border rounded-lg focus:outline-none focus:border-ink"
              />
            </div>
          </div>
        )}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!to.trim() || !subject.trim() || isPending}
          className="btn-primary disabled:opacity-50 flex items-center gap-2"
        >
          {isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          {isPending ? 'Sending…' : mode === 'batch' ? 'Start Batch Send' : 'Send Email'}
        </button>
      </div>

      {/* Confirmation dialog for >10 recipients */}
      <ConfirmDialog
        open={showConfirm}
        onConfirm={confirmSend}
        onClose={() => setShowConfirm(false)}
        title="Confirm send"
        description={confirmDescription}
        confirmLabel="Send"
        variant="default"
      />
    </div>
  )
}