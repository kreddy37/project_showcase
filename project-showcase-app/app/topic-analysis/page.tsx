'use client';

import { useState } from 'react';
import Navigation from '@/app/components/shared/Navigation';
import ProbabilityPieChart from '@/app/components/ProbabilityPieChart';

interface PredictionResponse {
  prediction: string;
  probability: Record<string, number>;
  processed_text: string;
  success: boolean;
  topic: string;
}

export default function TopicAnalysisPage() {
  const [text, setText] = useState('');
  const [results, setResults] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError('Please enter some text to analyze');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/predict-topic`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setResults(data);
      } else {
        setError('Error: Unable to get analysis');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setText('');
    setResults(null);
    setError(null);
  };

  const topicColors: Record<string, string> = {
    'franchise news': '#22c55e', // Green
    'contract/trade': '#3b82f6', // Blue
    'individual/game news': '#f59e0b', // Amber
    'standings/playoff news': '#ec4899', // Pink
  };

  const exampleTexts = [
    "The Canucks had an amazing game last night! Their defense was stellar and the goaltender made some incredible saves.",
    "I think the team needs to work on their power play. They've been struggling in that area for the last few games.",
    "Just watched the highlight reel from the game. What a performance by the forwards!",
  ];

  const handleLoadExample = (example: string) => {
    setText(example);
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom, #0d1324, #1a2550)' }}>
      <Navigation activePage="topic-analysis" />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">💬 Topic Analysis</h1>
          <p className="text-xl text-gray-300">
            Analyze the topics in hockey Reddit posts and discussions
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
            {/* Input Area */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-linear-to-b from-white/10 to-white/5 border border-white/15 rounded-2xl p-8">
                {/* Text Input */}
                <div className="mb-6">
                  <label htmlFor="text-input" className="block text-white font-semibold mb-3 text-lg">
                    Enter Text for Analysis
                  </label>
                  <textarea
                    id="text-input"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste your hockey Reddit post or discussion text here..."
                    className="w-full h-64 p-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:bg-white/15 transition-all duration-300 resize-none"
                  />
                </div>

                {/* Character Count */}
                <div className="mb-6 flex justify-between items-center">
                  <p className="text-gray-400 text-sm">
                    {text.length} characters
                  </p>
                  <p className="text-gray-400 text-sm">
                    {text.split(/\s+/).filter(w => w.length > 0).length} words
                  </p>
                </div>

                {/* Controls */}
                <div className="flex gap-3">
                  <button
                    onClick={handleAnalyze}
                    disabled={!text.trim() || loading}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all duration-300 ${
                      text.trim() && !loading
                        ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                        : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {loading ? 'Analyzing...' : 'Analyze Topics'}
                  </button>
                  <button
                    onClick={handleClear}
                    className="py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-all duration-300 border border-white/20"
                  >
                    Clear
                  </button>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mt-6 bg-yellow-900/30 border-2 border-yellow-500/50 rounded-lg p-4">
                    <p className="text-yellow-300">{error}</p>
                  </div>
                )}
              </div>

              {/* Example Texts */}
              <div>
                <p className="text-white font-semibold mb-4">Try Example Texts:</p>
                <div className="grid gap-3">
                  {exampleTexts.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => handleLoadExample(example)}
                      className="text-left p-4 bg-white/5 border border-white/15 rounded-xl hover:bg-white/10 hover:border-blue-500/50 transition-all duration-300 text-gray-300 hover:text-white text-sm flex gap-3 items-start"
                    >
                      <span className="font-mono text-xs text-white/30 shrink-0 pt-0.5">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span>{example}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Info Section */}
              <div className="bg-white/5 border border-white/15 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-white mb-4">About This Model</h3>
                <div className="grid md:grid-cols-2 gap-8 text-gray-300">
                  <div>
                    <h4 className="text-blue-400 font-semibold mb-2">Model Details</h4>
                    <p>
                      The data was collected from the r/hockey subreddit, with posts being lemmatized, stop words removed, and vectorization applied. LDA was applied to provide training labels to the data, and distinguish topics. Then, a torch neural network was optimized and fit on the data to provide predictions.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-blue-400 font-semibold mb-2">Topics Analyzed</h4>
                    <p>
                      The model can identify individual/game news, franchise news, contract/trade news, and standings/playoff news. It should be noted that optimization is still ongoing to improve performance.
                    </p>
                  </div>
                </div>
              </div>

              {/* How it was created */}
              <div className="bg-white/5 border border-white/20 rounded-2xl p-8">
                <h3 className="text-xl font-bold mb-3" style={{ color: '#4ade80' }}>How it was created</h3>
                <p className="text-gray-300 leading-relaxed">
                  This project was constructed with data collected using an academic torrent through BitTorrent, through which I procured roughly 100,000 posts from the r/nhl subreddit, using post titles for topic analysis. In a colab notebook, I used lemmatization, spelling correction, and stop word removal. Certain words were also removed from posts for purposes of data clarity, and LDA was performed on the data to determine appropriate categories. After this, a torch neural network was fitted to the data.
                </p>
              </div>

              {/* What I learned */}
              <div className="bg-white/5 border border-white/20 rounded-2xl p-8">
                <h3 className="text-xl font-bold mb-3" style={{ color: '#93c5fd' }}>What I learned</h3>
                <p className="text-gray-300 leading-relaxed">
                  This project was my first experience using the torch library in python. I learned just how much more complex and powerful a neural network can be when more than just its topography. I learned to find a suitable optimizer, loss function, and designed a full training loop essentially from scratch using torch. While the work was incredibly rewarding, I learned a great deal about selecting the right data, and the complexities of preprocessing messy data for the purposes of NLP, especially the practice of spell check and lemmatization. However, the result was a fun application of a new technique to data that pertains to my love of hockey. 
                </p>
              </div>
            </div>

          {/* Results Panel */}
          <div className="flex flex-col gap-6">
            {/* Results */}
            {results ? (
              <>
                <ProbabilityPieChart probability={results.probability} title="Topic Probabilities" colors={topicColors} />
                <div className="bg-blue-900/20 border border-white/15 rounded-2xl p-6">
                  <p className="text-white text-sm font-semibold mb-2">Predicted Topic</p>
                  <p className="text-blue-400 text-2xl font-bold capitalize">
                    {results.topic}
                  </p>
                </div>
              </>
            ) : loading ? (
              <div className="bg-blue-900/20 border border-white/15 rounded-2xl p-6 flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="inline-block w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                  <p className="text-blue-300">Analyzing text...</p>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-dashed border-white/15 rounded-2xl p-6 h-64 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl mb-2 text-white/40">💬</p>
                  <p className="text-gray-400 text-sm">
                    Enter text and analyze to see topic probabilities
                  </p>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-white/5 border border-white/15 rounded-xl p-4">
              <h4 className="text-white font-semibold mb-3 text-sm">Quick Tips</h4>
              <ul className="text-gray-300 text-xs space-y-2">
                <li>• Longer text tends to produce better results</li>
                <li>• Use text from actual Reddit posts</li>
                <li>• Multiple topics may be detected per text</li>
                <li>• Confidence scores indicate prediction certainty</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
