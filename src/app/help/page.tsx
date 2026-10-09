'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Shell } from '@/components/Shell';
import { Icon } from '@/components/ui';
import { supportPhone } from '@/lib/data';
import { deviceLimit, refundPolicy } from '@/lib/selectors';
import { useStore } from '@/lib/store';

/** Support contact and the questions students ask most. Policy numbers come from the admin's Settings. */
export default function HelpPage() {
  const { s, n } = useStore();
  const [open, setOpen] = useState<number | null>(0);
  const refund = refundPolicy(s);

  const faq: [string, string][] = [
    ['পেমেন্ট অনুমোদন হতে কত সময় লাগে?', 'bKash বা Nagad-এ টাকা পাঠিয়ে TrxID জমা দিলে সাধারণত ' + n('2–4') + ' ঘণ্টার মধ্যে অনুমোদন হয়। অনুমোদন হলে SMS আর নোটিফিকেশন পাবে। কোন অবস্থায় আছে, সেটা Payments পাতায় দেখা যায়।'],
    ['TrxID ভুল দিলে কী হবে?', 'পেমেন্ট অনুমোদন হবে না, আর কারণটা Payments পাতায় লেখা থাকবে। SMS-এ আসা TrxID মিলিয়ে আবার জমা দাও।'],
    ['টাকা ফেরত পাওয়ার নিয়ম কী?', 'ভর্তির ' + n(refund.days) + ' দিনের মধ্যে, আর কোর্সের ' + n(refund.watch) + '%-এর কম দেখে থাকলে পুরো টাকা ফেরত চাইতে পারো। এর বাইরে হলে অ্যাডমিন অবস্থা দেখে সিদ্ধান্ত নেন।'],
    ['কয়টা ডিভাইসে লগইন করা যায়?', 'একটা অ্যাকাউন্ট একসাথে ' + n(deviceLimit(s)) + 'টা ডিভাইসে চালানো যায়। নতুন ফোন নিলে সাপোর্টে জানাও — পুরোনো ডিভাইস সরিয়ে দেওয়া হবে।'],
    ['চ্যাপ্টার টেস্ট দেওয়া কি বাধ্যতামূলক?', 'না। অধ্যায়ের সব লেসন শেষ করলে টেস্ট খোলে। দিলে লিডারবোর্ডে পয়েন্ট পাবে, না দিলেও পরের অধ্যায় খোলা থাকে। চাইলে আবার দিতে পারো — সবচেয়ে ভালো ফলটাই ধরা হয়।'],
    ['লেসন বুঝতে না পারলে কী করবো?', 'লেসনের “Stuck?” ট্যাবে সাধারণ ভুলগুলো লেখা আছে। তাতেও না হলে Q&A ট্যাবে প্রশ্ন করো — শিক্ষক সাধারণত ২৪ ঘণ্টার মধ্যে উত্তর দেন। সব উত্তর My Questions পাতায় একসাথে পাবে।'],
  ];

  return (
    <Shell role="student" title="Help">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <PageHead title="Help" sub="সাধারণ প্রশ্নের উত্তর নিচে আছে। না মিললে সরাসরি সাপোর্টে কথা বলো।" />

        <div className="hero" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span className="tile" style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.16)' }}><Icon name="support_agent" size={28} /></span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Support</div>
            <div className="mono" style={{ fontSize: 24, lineHeight: 1.3, fontWeight: 600 }}>{supportPhone}</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>Sat–Thu · 10 AM – 8 PM</div>
          </div>
          <a href={'tel:' + supportPhone.replace(/\s/g, '')} className="btn btn-white" style={{ padding: '0 22px', gap: 8 }}><Icon name="call" size={20} />Call</a>
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="sec-h">Common Questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {faq.map(([q, a], i) => {
              const on = open === i;
              return (
                <div key={q} className="card" style={{ borderRadius: 18, borderColor: on ? 'var(--line-strong)' : 'var(--line)', overflow: 'hidden' }}>
                  <button onClick={() => setOpen(on ? null : i)} aria-expanded={on}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '14px 16px', border: 'none', background: 'transparent', textAlign: 'left', whiteSpace: 'normal', color: 'var(--ink)' }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 15, lineHeight: 1.7, fontWeight: 600 }}>{q}</span>
                    <Icon name={on ? 'expand_less' : 'expand_more'} size={24} style={{ color: 'var(--ink-3)' }} />
                  </button>
                  {on ? <div style={{ padding: '0 18px 18px', fontSize: 15, lineHeight: 1.8, color: 'var(--ink-2)' }}>{a}</div> : null}
                </div>
              );
            })}
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'var(--card-cols)', gap: 12 }}>
          <Link href="/payments" className="card tap" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
            <span className="tile set-ico"><Icon name="receipt_long" /></span>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>Payments</span><Icon name="chevron_right" style={{ color: 'var(--ink-3)' }} />
          </Link>
          <Link href="/questions" className="card tap" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
            <span className="tile set-ico"><Icon name="forum" /></span>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>My Questions</span><Icon name="chevron_right" style={{ color: 'var(--ink-3)' }} />
          </Link>
        </div>
      </div>
    </Shell>
  );
}
