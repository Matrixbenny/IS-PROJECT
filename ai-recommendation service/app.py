import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel

app = Flask(__name__)
CORS(app) # Enable CORS for all origins, or specify your frontend origin

# --- Configuration ---
RECOMMENDATION_PORT = 5001 # Choose a different port than your main backend
PROPERTY_DATA_PATH = 'data/properties.json'

# --- Load Property Data ---
properties = []
try:
    with open(PROPERTY_DATA_PATH, 'r') as f:
        properties = json.load(f)
    print(f"Loaded {len(properties)} properties from {PROPERTY_DATA_PATH}")
except FileNotFoundError:
    print(f"Error: {PROPERTY_DATA_PATH} not found. Ensure data/properties.json exists.")
    # Fallback to an empty list or exit
except json.JSONDecodeError:
    print(f"Error: Could not decode JSON from {PROPERTY_DATA_PATH}.")
    properties = []

# Create a DataFrame for easier manipulation and content-based recommendation
properties_df = pd.DataFrame(properties)

# --- AI Recommendation Logic (Simple Content-Based Filtering) ---
# This is a very basic example. A real AI service would be more complex.
# We'll use TF-IDF and cosine similarity on property descriptions and features.

tfidf_vectorizer = None
cosine_sim = None

def train_recommender():
    global tfidf_vectorizer, cosine_sim
    if properties_df.empty:
        print("No properties to train recommender on.")
        return

    # Combine relevant text fields for vectorization
    properties_df['combined_features'] = properties_df['description'] + ' ' + \
                                         properties_df['location'] + ' ' + \
                                         properties_df['type'] + ' ' + \
                                         properties_df['features'].apply(lambda x: ' '.join(x) if isinstance(x, list) else '')

    tfidf_vectorizer = TfidfVectorizer(stop_words='english')
    tfidf_matrix = tfidf_vectorizer.fit_transform(properties_df['combined_features'])

    cosine_sim = linear_kernel(tfidf_matrix, tfidf_matrix)
    print("Recommender model trained successfully.")

# Train the model on startup
train_recommender()

def get_content_based_recommendations(property_id, num_recommendations=3):
    """
    Generates content-based recommendations for a given property ID.
    Finds properties similar in description and features.
    """
    if properties_df.empty or tfidf_vectorizer is None or cosine_sim is None:
        print("Recommender not initialized or no data.")
        return []

    if property_id not in properties_df['id'].values:
        print(f"Property ID {property_id} not found for recommendations.")
        return []

    idx = properties_df[properties_df['id'] == property_id].index[0]
    sim_scores = list(enumerate(cosine_sim[idx]))
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)

    # Get the scores of the N most similar properties (excluding itself)
    sim_scores = sim_scores[1:num_recommendations+1] # +1 because it includes itself at idx 0

    property_indices = [i[0] for i in sim_scores]
    recommended_properties = properties_df.iloc[property_indices]

    return recommended_properties.to_dict(orient='records')


def get_general_recommendations(num_recommendations=3):
    """
    Provides a few random properties as general recommendations.
    This can be a fallback or for new users without history.
    """
    if properties_df.empty:
        return []
    # For a real AI, this could be top-rated, most popular, or a diverse sample
    return properties_df.sample(min(num_recommendations, len(properties_df))).to_dict(orient='records')


# --- API Endpoint ---
@app.route('/recommendations', methods=['GET'])
def get_recommendations():
    """
    Provides property recommendations based on query parameters.
    Can be extended to take user history, preferences, etc.
    """
    # Example: A simple recommendation based on a specific property ID
    # In a real system, you'd send user_id, search_history, favorite_properties
    # and use a more sophisticated collaborative filtering or hybrid model.
    # For now, if no specific property, provide general recommendations.
    target_property_id = request.args.get('based_on_property_id')
    user_id = request.args.get('user_id') # Not used in this simple example, but could be.

    recommendations = []
    if target_property_id:
        recommendations = get_content_based_recommendations(target_property_id, num_recommendations=3)
    else:
        # If no specific property provided, give some general recommendations
        recommendations = get_general_recommendations(num_recommendations=3)

    if recommendations:
        return jsonify(recommendations), 200
    else:
        return jsonify({"message": "No recommendations found."}), 404

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "AI Recommendation Service"}), 200

if __name__ == '__main__':
    print(f"Starting AI Recommendation Service on port {RECOMMENDATION_PORT}...")
    app.run(port=RECOMMENDATION_PORT, debug=True) # debug=True for development, turn off in production