# Demo script checklist and answer key

The calls in `calls/` are fictional. They're inbound support calls to **Harbor Bay Credit
Union**, a made-up US credit union whose card support is outsourced to a BPO in Cebu. The
card number in call 3 is the standard Visa test number, not a real card.

## Script checklist

The items every agent's call is scored against (#4). Each one has an id the API returns.

| id | Item | Passes when |
|---|---|---|
| `greeting` | Greeting | The agent greets the caller, says the company name and their own first name |
| `disclosure` | Recording disclosure | The agent says the call is recorded, before any account details are discussed |
| `verify` | Identity verification | The agent verifies identity with at least two of: full name, date of birth, last four digits of the card, ZIP code, before discussing the account |
| `purpose` | Purpose confirmed | The agent restates the caller's issue to confirm it |
| `recap` | Resolution recap | Near the end, the agent summarises what was done and what happens next, with any timeline |
| `closing` | Closing | The agent asks if there's anything else, thanks the caller, and closes |

## Compliance rules

What #5 flags. A flag cites its line and carries a severity.

| id | Rule | Severity |
|---|---|---|
| `pan_spoken` | A full card number (PAN) is read aloud or asked for in full | high |
| `no_disclosure` | No recording disclosure before account details | medium |
| `unverified_access` | Account details discussed before identity is verified | high |
| `unauthorized_promise` | A promise the agent can't make: a refund, fee waiver or credit limit change without saying it needs approval | medium |
| `rude_or_dismissive` | Interrupting, blaming the caller, or dismissive language | low |

## Answer key

What a correct run of #4 and #5 returns on each call. Use it to check prompts, and on stage.

| Call | Agent | `greeting` | `disclosure` | `verify` | `purpose` | `recap` | `closing` | Flags |
|---|---|---|---|---|---|---|---|---|
| `01-good.txt` | Mae | pass | pass | pass | pass | pass | pass | none |
| `02-sloppy.txt` | Jomar | pass | **fail** | **fail** | pass | **fail** | pass | `no_disclosure` [00:12], `unverified_access` [00:31] |
| `03-risky.txt` | Kevin | pass | pass | pass | pass | pass | **fail** | `pan_spoken` [01:05], `unauthorized_promise` [01:48], `rude_or_dismissive` [00:52] |
| `04-taglish.txt` | Joy | pass | pass | pass | pass | **fail** | pass | `unauthorized_promise` [01:19] |

Call 3 is the demo's centrepiece: it passes most of the script, so a 2% spot check by
score alone would miss it, but it holds the two most serious problems.

Call 4 is in Taglish, with some Cebuano-English from the caller: the calls our agents in
Cebu actually take (#18). It scores and flags like any other call. A flag's evidence quote
stays in the call's own words; coaching notes are always in English.
