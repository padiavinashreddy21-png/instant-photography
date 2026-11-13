import React, { useState } from 'react';
import { CheckCircle2, Mail, MapPin, Phone, Send } from 'lucide-react';

interface SubmittedNote {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  submittedAt: string;
}

export const ContactSection: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('Feature Feedback');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submittedNotes, setSubmittedNotes] = useState<SubmittedNote[]>([]);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (trimmedName.length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please provide a valid email address.');
      return;
    }
    if (trimmedMessage.length < 10) {
      setError('Please share at least 10 characters in your message.');
      return;
    }

    const note: SubmittedNote = {
      id: `fb_${Date.now()}`,
      name: trimmedName,
      email: trimmedEmail,
      topic,
      message: trimmedMessage,
      submittedAt: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setSubmittedNotes((prev) => [note, ...prev]);
    setJustSubmitted(true);
    setName('');
    setEmail('');
    setMessage('');
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="border-b border-zinc-800 pb-6">
        <p className="text-xs font-medium tracking-wider text-violet-400 uppercase">
          Support &amp; Feedback
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Contact &amp; Feedback
        </h1>
        <p className="mt-1.5 text-sm text-zinc-400">
          Have a suggestion for a new filter preset or encountered a camera
          hardware quirk? Send feedback directly below.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Left 5 columns: Direct Contact Details */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-2xl border border-zinc-800 bg-[#0B0B10] p-6">
            <h2 className="font-display text-lg font-semibold text-white">
              Project Contact Information
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Developed as part of the Instant Photography web application
              initiative. Reach out for collaboration, browser compatibility
              reports, or feature inquiries.
            </p>

            <div className="mt-6 space-y-4 border-t border-zinc-800/80 pt-5 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                <div>
                  <div className="text-xs text-zinc-400">Email</div>
                  <a
                    href="mailto:padiavinashreddy21@gmail.com"
                    className="font-medium text-white transition-colors hover:text-violet-300"
                  >
                    padiavinashreddy21@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                <div>
                  <div className="text-xs text-zinc-400">Phone</div>
                  <a
                    href="tel:+919502492681"
                    className="font-mono font-medium tabular-nums text-white transition-colors hover:text-violet-300"
                  >
                    +91 95024 92681
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                <div>
                  <div className="text-xs text-zinc-400">Department</div>
                  <p className="font-medium text-white">
                    B.Tech Computer Science · Enrollment 25CS003688
                  </p>
                </div>
              </div>
            </div>
          </div>

          {submittedNotes.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-[#0B0B10] p-6">
              <h3 className="font-display text-sm font-semibold text-white">
                Feedback Logged This Session ({submittedNotes.length})
              </h3>
              <div className="mt-3 space-y-3">
                {submittedNotes.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-3.5 text-xs"
                  >
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="font-medium text-white">{item.topic}</span>
                      <span className="tabular-nums">{item.submittedAt}</span>
                    </div>
                    <p className="mt-1.5 text-zinc-300">{item.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 7 columns: Feedback Form */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="rounded-2xl border border-zinc-800 bg-[#0B0B10] p-6 sm:p-8"
          >
            <h2 className="font-display text-lg font-semibold text-white">
              Send Feedback
            </h2>

            {justSubmitted && (
              <div
                role="status"
                className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-violet-500/40 bg-violet-950/30 px-4 py-3 text-sm text-violet-200"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-400" />
                  <span>
                    Thank you. Your feedback has been recorded for this session.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setJustSubmitted(false)}
                  className="text-xs font-medium text-violet-300 underline hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-200"
              >
                {error}
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="contact-name"
                  className="mb-1.5 block text-xs font-medium text-zinc-300"
                >
                  Full Name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Mercer"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-email"
                  className="mb-1.5 block text-xs font-medium text-zinc-300"
                >
                  Email Address
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5">
              <label
                htmlFor="contact-topic"
                className="mb-1.5 block text-xs font-medium text-zinc-300"
              >
                Feedback Category
              </label>
              <select
                id="contact-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none"
              >
                <option value="Feature Feedback">Feature Feedback</option>
                <option value="Filter & Color Request">
                  Filter &amp; Color Request
                </option>
                <option value="Camera Hardware Issue">
                  Camera Hardware Issue
                </option>
                <option value="General Inquiry">General Inquiry</option>
              </select>
            </div>

            <div className="mt-5">
              <label
                htmlFor="contact-message"
                className="mb-1.5 block text-xs font-medium text-zinc-300"
              >
                Message
              </label>
              <textarea
                id="contact-message"
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share what worked well or what you would like improved..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
              >
                <Send className="h-4 w-4" />
                <span>Submit Feedback</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};
