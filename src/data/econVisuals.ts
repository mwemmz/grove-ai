/** Economics visuals for ECF110 Introduction to Macroeconomics: each topic pairs an animation (HyperFrames
 *  composition in public/visuals/econ-*) with the same idea in words, step by step, so students get both at once.
 *  Numbers follow the course's own examples (Unit 2.2 / Keynes problems, Unit 5.1 exercise, Unit 5.2 worked example). */
import type { VisualStep, VisualTopic } from './visualTopics';

export type EconTopicId =
  | 'econ-circular-flow'
  | 'econ-keynesian-cross'
  | 'econ-ad-as'
  | 'econ-inflation'
  | 'econ-money-market'
  | 'econ-credit-creation'
  | 'econ-phillips'
  | 'econ-exchange-rate'
  | 'econ-laffer';

const steps = (ranges: [number, number][], items: [string, string][]): VisualStep[] =>
  items.map(([title, text], i) => ({ title, text, t0: ranges[i][0], t1: ranges[i][1] }));
const even = (n: number, each: number): [number, number][] => Array.from({ length: n }, (_, i) => [i * each, (i + 1) * each]);

export const ECON_TOPICS: VisualTopic[] = [
  {
    id: 'econ-circular-flow',
    group: 'Economics',
    name: 'The circular flow of income',
    courseCode: 'ECF110',
    unit: 'Unit 2.1 · National income',
    src: 'visuals/econ-circular-flow/index.html',
    steps: steps(even(5, 3), [
      ['Two sectors', 'Households own the factors of production (land, labour, capital). Firms hire them to produce goods and services.'],
      ['The real flow', 'Factor services go from households to firms. Goods and services go from firms back to households.'],
      ['The money flow', 'Firms pay wages, rent, interest and profit. Households spend that income on firms’ output. So output = income = expenditure.'],
      ['Leakages', 'Saving (to banks), taxes (to government) and imports (abroad) take money out of the flow to local firms.'],
      ['Injections', 'Investment, government spending and exports put money back in. The flow is in balance when S + T + M = I + G + X.'],
    ]),
    notes: {
      summary:
        'The circular flow shows why the three ways of measuring national income give the same answer: every kwacha spent on output is a kwacha of income to someone. Leakages and injections decide whether the flow grows or shrinks.',
      ideas: [
        'In a two-sector economy, all income is spent, so output = income = expenditure.',
        'Leakages (withdrawals): saving, taxes, imports. Injections: investment, government spending, exports.',
        'If injections exceed leakages, national income rises; if leakages exceed injections, it falls.',
        'This identity is why the output, income and expenditure methods should give the same total.',
      ],
      table: {
        heading: ['Leakage', 'Matching injection', 'Who'],
        rows: [
          ['Saving (S)', 'Investment (I)', 'Financial sector'],
          ['Taxes (T)', 'Government spending (G)', 'Government'],
          ['Imports (M)', 'Exports (X)', 'Rest of the world'],
        ],
      },
      useWhen: ['You need to explain why output, income and expenditure methods agree.', 'A question asks what happens to national income when saving or imports rise.'],
      watchOut: ['Each leakage does not have to equal its own injection. Only the totals must balance: S + T + M = I + G + X.', 'Transfer payments (pensions, grants) are not payment for output, so they are not part of G in national income.'],
    },
    quiz: [
      { q: 'Which of these is a leakage from the circular flow?', options: ['Exports', 'Government spending', 'Saving', 'Investment'], answer: 2, why: 'Saving is income not spent on output, so it leaves the flow. The others are injections.', step: 3 },
      { q: 'In a two-sector economy, why does output equal income?', options: ['Government sets prices', 'Every kwacha spent on output is paid out as income', 'Firms save everything', 'Imports cancel exports'], answer: 1, why: 'Firms pay out what they receive as wages, rent, interest and profit.', step: 2 },
      { q: 'Injections are greater than leakages. What happens to national income?', options: ['It rises', 'It falls', 'It stays the same', 'It becomes negative'], answer: 0, why: 'More is entering the flow than leaving it, so spending and income grow.', step: 4 },
    ],
  },
  {
    id: 'econ-keynesian-cross',
    group: 'Economics',
    name: 'The Keynesian cross and the multiplier',
    courseCode: 'ECF110',
    unit: 'Unit 2.2 · Income determination',
    src: 'visuals/econ-keynesian-cross/index.html',
    steps: steps([[0, 3.5], [3.5, 7], [7, 10.5], [10.5, 14], [14, 18.5]], [
      ['The 45° line', 'Every point on the 45° line is where planned spending (AE) equals income (Y). Equilibrium must be on it.'],
      ['Planned spending', 'C = 250 + 0.75(Y − 200), I = 80, G = 150. Add them: AE = 330 + 0.75Y. Its slope is the MPC, 0.75.'],
      ['Equilibrium', 'Set Y = AE: Y = 330 + 0.75Y, so 0.25Y = 330 and Y = 1,320. Then C = 250 + 0.75 × 1,120 = 1,090.'],
      ['Government spends 50 more', 'G rises from 150 to 200. The AE line shifts up by exactly 50: AE = 380 + 0.75Y.'],
      ['The multiplier', 'Income rises by 200, not 50. The multiplier is 1 ÷ (1 − MPC) = 4, because each round of spending becomes someone’s income: 50 + 37.5 + 28.1 + … = 200.'],
    ]),
    notes: {
      summary:
        'In the Keynesian model, output adjusts to planned spending. Equilibrium income is where AE = Y, and any change in autonomous spending changes income by a multiple of itself.',
      ideas: [
        'Equilibrium: Y = C + I + G (closed economy) or Y = C + I + G + (X − M) (open economy).',
        'Spending multiplier = 1 ÷ (1 − MPC) = 1 ÷ MPS.',
        'Tax multiplier = −MPC ÷ (1 − MPC). It is smaller than the spending multiplier because part of a tax cut is saved first.',
        'With imports as a share of income (M = M₀ + mY), the foreign trade multiplier is 1 ÷ (1 − MPC + m), which is smaller.',
      ],
      table: {
        heading: ['Change', 'Multiplier', 'With MPC = 0.75'],
        rows: [
          ['Government spending ΔG', '1 ÷ (1 − MPC)', '× 4'],
          ['Taxes ΔT', '−MPC ÷ (1 − MPC)', '× −3'],
          ['Investment ΔI', '1 ÷ (1 − MPC)', '× 4'],
        ],
      },
      useWhen: [
        'A numerical question gives C, I, G and T and asks for equilibrium income.',
        'You are asked how much income changes after a change in G, I or T.',
        'Worked example from your notes: a tax cut of 30 with MPC 0.75 raises income by 0.75 ÷ 0.25 × 30 = 90.',
      ],
      watchOut: [
        'Consumption depends on disposable income (Y − T), not Y. Substitute it before solving.',
        'The paradox of thrift: if everyone tries to save more, income falls and total saving may not rise.',
      ],
    },
    quiz: [
      { q: 'C = 250 + 0.75(Y − 200), I = 80, G = 150. What is equilibrium income?', options: ['1,320', '1,120', '480', '1,500'], answer: 0, why: 'Y = 330 + 0.75Y, so Y = 330 ÷ 0.25 = 1,320.', step: 2 },
      { q: 'The MPC is 0.8. What is the government spending multiplier?', options: ['0.8', '1.25', '4', '5'], answer: 3, why: '1 ÷ (1 − 0.8) = 1 ÷ 0.2 = 5.', step: 4 },
      { q: 'Why is the multiplier greater than 1?', options: ['Prices rise', 'Each round of spending becomes income that is partly spent again', 'Taxes fall automatically', 'Imports rise'], answer: 1, why: 'Extra spending is someone’s income, and they spend the MPC share of it, and so on.', step: 4 },
    ],
  },
  {
    id: 'econ-ad-as',
    group: 'Economics',
    name: 'AD and the three ranges of AS',
    courseCode: 'ECF110',
    unit: 'Unit 3 · Aggregate supply and demand',
    src: 'visuals/econ-ad-as/index.html',
    steps: steps([[0, 3.5], [3.5, 7.4], [7.4, 10.9], [10.9, 14.4], [14.4, 18]], [
      ['Why AD slopes down', 'Three effects: the real balance (wealth) effect, the interest rate effect, and the foreign trade effect. A lower price level raises the real quantity of goods demanded.'],
      ['Three ranges of AS', 'Keynesian range: flat, with idle resources. Intermediate range: rising, as bottlenecks appear. Classical range: vertical at full-employment output Yf.'],
      ['AD rises, Keynesian range', 'With spare capacity, firms produce more without raising prices. Output rises, the price level does not.'],
      ['AD rises, intermediate range', 'Some resources run short, costs rise. Output and the price level both rise.'],
      ['AD rises, classical range', 'The economy is already at Yf. More demand only raises prices: inflation, with no extra output.'],
    ]),
    notes: {
      summary:
        'The AD–AS model explains output and the price level together. What an increase in AD does depends on where the economy is on the AS curve: real output when there is spare capacity, prices when there is none.',
      ideas: [
        'AD = C + I + G + (X − M). It shifts when any of these change at a given price level.',
        'SAS shifts with wages, input prices, technology, business taxes and subsidies, and available resources.',
        'LAS depends on labour, capital and technology. It is vertical at full-employment output.',
        'Classical economists see AS as vertical; Keynes assumed prices were fixed (flat AS) in a slump.',
      ],
      table: {
        heading: ['AS range', 'Shape', 'Effect of AD ↑'],
        rows: [
          ['Keynesian', 'Flat', 'Y ↑, P unchanged'],
          ['Intermediate', 'Rising', 'Y ↑ and P ↑'],
          ['Classical', 'Vertical at Yf', 'P ↑ only'],
        ],
      },
      useWhen: ['A question asks whether expansionary policy will raise output or just prices.', 'You need to explain the debate between classical and Keynesian views.'],
      watchOut: [
        'A change in the price level is a movement along AD, not a shift of it.',
        'Do not confuse the short-run AS (upward sloping) with long-run AS (vertical).',
      ],
    },
    quiz: [
      { q: 'The economy has lots of unemployed resources. AD rises. What happens?', options: ['Only prices rise', 'Output rises, prices stay about the same', 'Both fall', 'Output falls'], answer: 1, why: 'In the Keynesian (flat) range there is spare capacity, so firms can produce more at the same prices.', step: 2 },
      { q: 'Which is NOT a reason AD slopes downward?', options: ['Real balance effect', 'Interest rate effect', 'Foreign trade effect', 'Rising wages'], answer: 3, why: 'Rising wages shift SAS. The three AD effects are wealth, interest rate and foreign trade.', step: 0 },
      { q: 'At full employment, AD rises. The result is…', options: ['Higher output only', 'Inflation with no extra output', 'Lower prices', 'Unemployment'], answer: 1, why: 'In the classical range the AS curve is vertical, so only the price level can rise.', step: 4 },
    ],
  },
  {
    id: 'econ-inflation',
    group: 'Economics',
    name: 'Demand-pull and cost-push inflation',
    courseCode: 'ECF110',
    unit: 'Unit 7 · Inflation',
    src: 'visuals/econ-inflation/index.html',
    steps: steps(even(5, 3), [
      ['Starting point', 'AD meets short-run AS at a price level of 50 and output of 50.'],
      ['Demand-pull', 'Excess demand: AD shifts right. Prices rise (50 → 60) and output rises (50 → 62.5). Too much money chasing too few goods.'],
      ['Cost-push', 'Back to the start. This time costs rise: higher wages, dearer fuel, or a weaker kwacha raising the cost of imported inputs. SRAS shifts left.'],
      ['Stagflation', 'Prices rise (50 → 60) while output falls (50 → 37.5). Rising prices and falling output together is stagflation.'],
      ['The policy dilemma', 'If government boosts AD to restore output, prices rise further (to 70). Demand policy cannot fix both at once.'],
    ]),
    notes: {
      summary:
        'Inflation is a sustained rise in the general price level. Demand-pull inflation comes from too much spending; cost-push inflation comes from rising costs of production. They look different on the AD–AS diagram and call for different policies.',
      ideas: [
        'Monetarists: inflation is caused by the money supply growing faster than output (MV = PT).',
        'Demand-pull: AD shifts right. Prices and output both rise (until full employment).',
        'Cost-push: SRAS shifts left. Prices rise but output falls.',
        'Inflation is measured with a price index such as the CPI. Real value = nominal value ÷ price index × 100.',
      ],
      table: {
        heading: ['Type', 'Curve that shifts', 'Output'],
        rows: [
          ['Demand-pull', 'AD right', 'Rises'],
          ['Cost-push', 'SRAS left', 'Falls'],
        ],
      },
      useWhen: ['You need to say what caused a rise in prices, and what policy fits.', 'A question mentions fuel prices, wage increases or a depreciating kwacha.'],
      watchOut: ['A one-off price rise is not inflation. Inflation is a sustained rise.', 'Fighting cost-push inflation by cutting AD makes unemployment worse.'],
    },
    quiz: [
      { q: 'Fuel prices rise sharply. What happens on the AD–AS diagram?', options: ['AD shifts right', 'SRAS shifts left', 'LRAS shifts right', 'Nothing'], answer: 1, why: 'Fuel is a production cost, so supply falls at every price level: cost-push.', step: 2 },
      { q: 'Stagflation means…', options: ['Low inflation and low unemployment', 'Rising prices with falling output', 'Falling prices', 'Rapid growth'], answer: 1, why: 'Stagnation (falling output) plus inflation.', step: 3 },
      { q: 'Which is demand-pull inflation?', options: ['Wage rises push up costs', 'Government spending rises at full employment', 'Imported inputs get dearer', 'A drought cuts harvests'], answer: 1, why: 'Extra spending shifts AD right; the others are cost or supply shocks.', step: 1 },
    ],
  },
  {
    id: 'econ-money-market',
    group: 'Economics',
    name: 'The money market (liquidity preference)',
    courseCode: 'ECF110',
    unit: 'Unit 5.1 · Monetary sector',
    src: 'visuals/econ-money-market/index.html',
    steps: steps([[0, 3.5], [3.5, 7], [7, 10.5], [10.5, 14], [14, 18]], [
      ['Money demand', 'People hold money for transactions, precaution and speculation. A higher interest rate makes holding money costlier, so less is demanded: (M/P)ᵈ = 1,000 − 100r.'],
      ['Money supply', 'The Bank of Zambia sets M = 1,000. With P = 2, the supply of real balances is M/P = 500, a vertical line.'],
      ['Equilibrium', 'Set supply equal to demand: 500 = 1,000 − 100r, so r = 5%.'],
      ['BoZ raises M to 1,200', 'M/P becomes 600: 600 = 1,000 − 100r, so r = 4%. Cheaper borrowing raises investment and AD.'],
      ['Income rises', 'More income means more transactions, so money demand shifts right at every interest rate, and r rises again.'],
    ]),
    notes: {
      summary:
        'Keynes’s theory of liquidity preference says the interest rate is set where the supply of real money balances equals the demand for them. The central bank controls supply; income and the interest rate drive demand.',
      ideas: [
        'Money demand: (M/P)ᵈ = L(r, Y). It falls when r rises and rises when Y rises.',
        'Motives for holding money: transactions, precautionary, speculative.',
        'Money supply is set by the central bank (BoZ), so it is vertical in r.',
        'This is the start of the monetary transmission chain: M ↑ → r ↓ → I ↑ → AD ↑ → Y ↑.',
      ],
      table: {
        heading: ['Change', 'Shift', 'Interest rate'],
        rows: [
          ['BoZ raises M', 'Supply right', 'Falls'],
          ['Income rises', 'Demand right', 'Rises'],
          ['Price level rises (M fixed)', 'Real supply left', 'Rises'],
        ],
      },
      useWhen: [
        'The Unit 5.1 exercise: to raise r to 7%, BoZ needs M/P = 300, so with P = 2 it sets M = 600.',
        'Explaining how monetary policy affects investment.',
      ],
      watchOut: ['Use real balances M/P, not M, on the horizontal axis.', 'The loanable funds theory explains the interest rate differently: through saving and investment.'],
    },
    quiz: [
      { q: '(M/P)ᵈ = 1,000 − 100r, M = 1,000, P = 2. What is the equilibrium interest rate?', options: ['2%', '5%', '10%', '50%'], answer: 1, why: 'M/P = 500, so 500 = 1,000 − 100r and r = 5.', step: 2 },
      { q: 'BoZ wants r = 7% (P = 2). What money supply should it set?', options: ['300', '600', '700', '1,400'], answer: 1, why: 'At r = 7, demand is 1,000 − 700 = 300 = M/P, so M = 300 × 2 = 600.', step: 3 },
      { q: 'National income rises. What happens to the interest rate?', options: ['Falls', 'Rises', 'No change', 'Becomes zero'], answer: 1, why: 'Money demand rises with income; with supply fixed, r must rise.', step: 4 },
    ],
  },
  {
    id: 'econ-credit-creation',
    group: 'Economics',
    name: 'How banks create money',
    courseCode: 'ECF110',
    unit: 'Unit 5.2 · Financial system',
    src: 'visuals/econ-credit-creation/index.html',
    steps: steps(even(5, 3), [
      ['A deposit', 'A farmer deposits K100,000 at ZANACO. With a reserve requirement of 10%, ZANACO keeps K10,000 and can lend K90,000.'],
      ['A loan becomes a deposit', 'ZANACO lends K90,000. The borrower spends it, and the person paid deposits it at Stanbic.'],
      ['Round after round', 'Stanbic keeps K9,000 and lends K81,000 (deposited at FNB), then K72,900 at Atlas Mara, K65,610 at Indo Zambia… Each round is 90% of the one before.'],
      ['The total', 'All the deposits add up to K100,000 × 1 ÷ 0.10 = K1,000,000. The money (credit) multiplier is 1 ÷ reserve ratio = 10.'],
      ['The limits', 'In practice the multiplier is smaller: people hold some cash, banks keep extra reserves, and there may not be enough creditworthy borrowers.'],
    ]),
    notes: {
      summary:
        'Commercial banks create money by lending. Because each loan is spent and redeposited, an initial deposit supports a much larger total of deposits, limited by the reserve ratio.',
      ideas: [
        'Total deposits = initial deposit × 1 ÷ reserve ratio.',
        'New money created = total deposits − initial deposit (K900,000 in the example).',
        'Raising the reserve ratio is a monetary policy tool: it shrinks the multiplier.',
        'Banks balance profitability (lend more), liquidity and security (keep reserves).',
      ],
      table: {
        heading: ['Reserve ratio', 'Multiplier', 'From K100,000'],
        rows: [
          ['10%', '10', 'K1,000,000'],
          ['20%', '5', 'K500,000'],
          ['25%', '4', 'K400,000'],
        ],
      },
      useWhen: ['A question gives a deposit and a reserve ratio and asks for total deposits or new money.', 'Explaining how a change in the BoZ reserve requirement affects the money supply.'],
      watchOut: ['The simple multiplier assumes no cash leakage and no excess reserves.', 'Total deposits include the first deposit; new money created does not.'],
    },
    quiz: [
      { q: 'A K50,000 deposit, reserve ratio 20%. What are total deposits?', options: ['K60,000', 'K100,000', 'K250,000', 'K500,000'], answer: 2, why: 'Multiplier = 1 ÷ 0.20 = 5, so 5 × K50,000 = K250,000.', step: 3 },
      { q: 'In the ZANACO example, how much does ZANACO lend?', options: ['K10,000', 'K90,000', 'K100,000', 'K1,000,000'], answer: 1, why: 'It keeps 10% (K10,000) and lends the other K90,000.', step: 0 },
      { q: 'Which makes the real multiplier smaller than 1 ÷ reserve ratio?', options: ['People keep more cash outside banks', 'Lower reserve ratio', 'More borrowers', 'More deposits'], answer: 0, why: 'Cash held outside banks is not redeposited, so the chain of lending breaks.', step: 4 },
    ],
  },
  {
    id: 'econ-phillips',
    group: 'Economics',
    name: 'The Phillips curve and stagflation',
    courseCode: 'ECF110',
    unit: 'Unit 6 · Labour markets and unemployment',
    src: 'visuals/econ-phillips/index.html',
    steps: steps(even(5, 3), [
      ['The trade-off', 'A. W. Phillips (1958) found that when unemployment is low, money wage inflation is high, and the reverse. They are inversely related.'],
      ['Moving along the curve', 'Government boosts demand: unemployment falls from 6% to 4%, but inflation rises from 2% to 5%.'],
      ['Expectations catch up', 'Workers now expect 5% inflation and bargain for higher wages. The short-run curve shifts up.'],
      ['Back to the natural rate', 'Unemployment returns to its natural (equilibrium) rate of 6%, but inflation stays at 5%. In the long run the curve is vertical: no lasting trade-off.'],
      ['Stagflation', 'A supply shock shifts the curve up again: unemployment 8% and inflation 6.5%, both high at once, as in the 1970s.'],
    ]),
    notes: {
      summary:
        'The Phillips curve shows a short-run trade-off between inflation and unemployment. Once people expect higher inflation, the trade-off disappears and the economy returns to the natural rate of unemployment with higher inflation.',
      ideas: [
        'Short run: lower unemployment can be bought with higher inflation.',
        'Long run: unemployment returns to the natural rate; the long-run Phillips curve is vertical.',
        'Stagflation (high inflation and high unemployment) broke the simple Phillips relationship in the 1970s.',
        'Supply-side policies aim to lower the natural rate itself.',
      ],
      table: {
        heading: ['Curve', 'Shape', 'Meaning'],
        rows: [
          ['Short-run Phillips curve', 'Downward sloping', 'Trade-off exists'],
          ['Long-run Phillips curve', 'Vertical at natural rate', 'No lasting trade-off'],
        ],
      },
      useWhen: ['A question asks whether government can keep unemployment low by accepting inflation.', 'Explaining stagflation.'],
      watchOut: ['Phillips’s original study was about money wage inflation, not price inflation.', 'Okun’s law links unemployment to output, not inflation.'],
    },
    quiz: [
      { q: 'On the short-run Phillips curve, lower unemployment comes with…', options: ['Lower inflation', 'Higher inflation', 'No change in inflation', 'Deflation'], answer: 1, why: 'The curve slopes down: moving to lower unemployment means higher inflation.', step: 1 },
      { q: 'Why does the short-run curve shift up?', options: ['Workers expect higher inflation and demand higher wages', 'Unemployment falls', 'Exports rise', 'Interest rates fall'], answer: 0, why: 'Higher expected inflation is built into wage bargains.', step: 2 },
      { q: 'What does a vertical long-run Phillips curve mean?', options: ['A permanent trade-off', 'No lasting trade-off between inflation and unemployment', 'Zero unemployment', 'Zero inflation'], answer: 1, why: 'Unemployment returns to the natural rate whatever the inflation rate.', step: 3 },
    ],
  },
  {
    id: 'econ-exchange-rate',
    group: 'Economics',
    name: 'How the kwacha exchange rate is set',
    courseCode: 'ECF110',
    unit: 'Unit 8 · International sector',
    src: 'visuals/econ-exchange-rate/index.html',
    steps: steps([[0, 3], [3, 6], [6, 9], [9, 12], [12, 15.5]], [
      ['Demand for kwacha', 'Foreigners need kwacha to pay for Zambian exports (like copper) and to invest in Zambia. Speculators and BoZ may also buy kwacha.'],
      ['Supply of kwacha', 'Zambians sell kwacha for foreign currency to pay for imports and to invest abroad. Speculators expecting a fall also sell.'],
      ['The exchange rate', 'The value of the kwacha settles where the demand for kwacha meets the supply: here, 5 US cents per kwacha.'],
      ['Copper prices rise', 'Export earnings rise, so demand for kwacha shifts right. The kwacha appreciates to 5.6 US cents: imports get cheaper, exports dearer abroad.'],
      ['Fuel imports rise', 'Back to the start. More kwacha is sold to buy dollars, so supply shifts right. The kwacha depreciates to 4.4 US cents: imports get dearer, which feeds cost-push inflation.'],
    ]),
    notes: {
      summary:
        'Under a floating system, the kwacha’s value is a price set by supply and demand in the foreign exchange market. Anything that changes the flow of trade, investment or speculation moves it.',
      ideas: [
        'Demand for kwacha comes from exports, inward investment, speculation and central bank buying.',
        'Supply of kwacha comes from imports, investment abroad, speculation and central bank selling.',
        'Appreciation: the kwacha buys more foreign currency. Depreciation: it buys less.',
        'The exchange rate links to the balance of payments and to inflation through import prices.',
      ],
      table: {
        heading: ['Event', 'Shift', 'Kwacha'],
        rows: [
          ['Copper price rises', 'Demand right', 'Appreciates'],
          ['Fuel import bill rises', 'Supply right', 'Depreciates'],
          ['Foreign investors arrive', 'Demand right', 'Appreciates'],
          ['Speculators expect a fall', 'Supply right', 'Depreciates'],
        ],
      },
      useWhen: ['A question asks how a copper price change or an import surge affects the kwacha.', 'Linking the exchange rate to inflation or the balance of payments.'],
      watchOut: ['Be clear which currency is on each axis. Here the price is US cents per kwacha.', 'A depreciation helps exporters but raises the cost of imported inputs.'],
    },
    quiz: [
      { q: 'Copper prices rise. What happens to the kwacha?', options: ['Depreciates', 'Appreciates', 'No change', 'It becomes fixed'], answer: 1, why: 'More export earnings raise demand for kwacha.', step: 3 },
      { q: 'Who supplies kwacha on the foreign exchange market?', options: ['Foreign tourists visiting Zambia', 'Zambians buying imports', 'Copper buyers abroad', 'Foreign investors entering Zambia'], answer: 1, why: 'Importers sell kwacha to get the foreign currency they must pay with.', step: 1 },
      { q: 'The kwacha depreciates. What happens to the price of imported fuel in kwacha?', options: ['Falls', 'Rises', 'No change', 'Becomes free'], answer: 1, why: 'Each dollar now costs more kwacha, so imports get dearer.', step: 4 },
    ],
  },
  {
    id: 'econ-laffer',
    group: 'Economics',
    name: 'The Laffer curve',
    courseCode: 'ECF110',
    unit: 'Unit 4 · Government sector',
    src: 'visuals/econ-laffer/index.html',
    steps: steps(even(5, 3), [
      ['A 0% tax rate', 'With a 0% tax rate, government revenue is zero.'],
      ['A 100% tax rate', 'With a 100% rate, revenue is also zero: nobody would work if government took all their income.'],
      ['Revenue peaks in between', 'Somewhere between them is the rate Tx that raises the most revenue.'],
      ['Two rates, same revenue', 'A low rate (25%) and a high rate (75%) can raise the same revenue.'],
      ['Cutting rates', 'Above Tx, cutting the rate can raise revenue (75% → 60% here). Below Tx, a cut lowers revenue.'],
    ]),
    notes: {
      summary:
        'The Laffer curve shows that tax revenue first rises and then falls as the tax rate rises, because very high rates discourage work, investment and honest reporting.',
      ideas: [
        'Revenue = tax rate × tax base, and the base shrinks as the rate rises.',
        'There is a revenue-maximising rate, Tx.',
        'Supply-side economists use the curve to argue for lower tax rates.',
      ],
      table: {
        heading: ['Tax rate', 'Revenue', 'Why'],
        rows: [
          ['0%', 'Zero', 'Nothing is taxed'],
          ['Tx', 'Maximum', 'Best balance of rate and base'],
          ['100%', 'Zero', 'No incentive to earn'],
        ],
      },
      useWhen: ['A question asks whether cutting taxes can raise revenue.', 'Discussing supply-side policy.'],
      watchOut: ['Nobody knows exactly where Tx is. The diagram does not show it at 50% in practice.', 'Below Tx, a tax cut loses revenue.'],
    },
    quiz: [
      { q: 'What is government revenue at a 100% tax rate on the Laffer curve?', options: ['Maximum', 'Zero', 'Half of income', 'Unchanged'], answer: 1, why: 'Nobody would work for nothing, so the tax base disappears.', step: 1 },
      { q: 'When can a tax cut raise revenue?', options: ['When the rate is below Tx', 'When the rate is above Tx', 'Always', 'Never'], answer: 1, why: 'Above Tx, the larger tax base outweighs the lower rate.', step: 4 },
      { q: 'Two different tax rates give the same revenue. Why?', options: ['Rounding', 'One is on each side of the peak', 'Revenue is fixed', 'Inflation'], answer: 1, why: 'The curve rises then falls, so each revenue level below the peak is reached twice.', step: 3 },
    ],
  },
];

/* ---------- dual coding: find the picture for some words ---------- */

const MATCH: [EconTopicId, RegExp][] = [
  ['econ-keynesian-cross', /\b(keynesian cross|multiplier|45[- ]?degree|equilibrium (income|output)|consumption function|marginal propensity|mpc|mps|planned (expenditure|spending)|paradox of thrift|income determination|three[- ]sector|two[- ]sector model)\b/i],
  ['econ-circular-flow', /\b(circular flow|leakages?|injections?|withdrawals?|national income|gdp|gnp|expenditure method|income method|output method|value added)\b/i],
  ['econ-ad-as', /\b(aggregate (demand|supply)|ad[- /]as|as[- /]ad|lras|sras|las\b|sas\b|real balance effect|full[- ]employment output|keynesian range|classical range)\b/i],
  ['econ-inflation', /\b(inflation|demand[- ]pull|cost[- ]push|stagflation|price index|cpi|deflation)\b/i],
  ['econ-money-market', /\b(liquidity preference|money demand|demand for money|money supply|money market|interest rates?|real money balances|speculative motive|transactions? motive|loanable funds)\b/i],
  ['econ-credit-creation', /\b(credit creation|money creation|reserve (ratio|requirement)|money multiplier|credit multiplier|commercial banks?|fractional reserve)\b/i],
  ['econ-phillips', /\b(phillips curve|unemployment|natural rate|okun|labour market|labor market)\b/i],
  ['econ-exchange-rate', /\b(exchange rates?|kwacha|appreciat\w*|depreciat\w*|forex|foreign exchange|balance of payments|comparative advantage|absolute advantage)\b/i],
  ['econ-laffer', /\b(laffer|tax rates?|tax revenue)\b/i],
];

/** Topics whose picture explains this text, best match first (at most `n`). */
export function econVisualsFor(text: string, n = 2): EconTopicId[] {
  const scored = MATCH.map(([id, re]) => {
    const g = new RegExp(re.source, 'gi');
    return { id, hits: (text.match(g) ?? []).length };
  }).filter((s) => s.hits > 0);
  scored.sort((a, b) => b.hits - a.hits);
  return scored.slice(0, n).map((s) => s.id);
}

/** Where to put pictures in a long note: each topic goes after the paragraph (slide) that talks about it most,
 *  never after the title slide unless nothing else matches. Returns paragraph index → topics. */
export function placeVisuals(paras: string[], max = 4): Map<number, EconTopicId[]> {
  const best = new Map<EconTopicId, { idx: number; hits: number; total: number }>();
  paras.forEach((para, idx) => {
    for (const [id, re] of MATCH) {
      const hits = (para.match(new RegExp(re.source, 'gi')) ?? []).length * (idx === 0 ? 0.5 : 1);
      if (!hits) continue;
      const cur = best.get(id);
      if (!cur) best.set(id, { idx, hits, total: hits });
      else {
        cur.total += hits;
        if (hits > cur.hits) Object.assign(cur, { idx, hits });
      }
    }
  });
  const chosen = [...best.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, max);
  const out = new Map<number, EconTopicId[]>();
  for (const [id, { idx }] of chosen) out.set(idx, [...(out.get(idx) ?? []), id]);
  return out;
}
