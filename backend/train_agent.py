import os
import time
import argparse
import logging
import warnings

# Ignore noisy huggingface warnings
warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("RL_Trainer")

try:
    from stable_baselines3 import PPO
    from stable_baselines3.common.env_checker import check_env
    from ml_agents.dataset_loader import RetouchDataset
    from ml_agents.retouch_env import RestouchEnv
except ImportError:
    print("Dependencies missing! Run: pip install -r requirements.txt")

def main():
    parser = argparse.ArgumentParser(description='Train RL agent for Photo Retouching')
    parser.add_argument('--timesteps', type=int, default=1000, help='Total RL training frames')
    args = parser.parse_args()

    logger.info("Initializing Enterprise RL Retouching Pipeline...")
    # Instantiate the data loader
    loader = RetouchDataset(max_samples=50) # Micro-batch mode for local machine tuning
    
    # Instantiate the Gym environment
    env = RestouchEnv(dataloader=loader)
    
    # Gym environment structural check
    try:
        check_env(env)
        logger.info("Gymnasium Environment structural mapping verified.")
    except Exception as e:
        logger.error(f"Environment validation error: {e}")
        return
        
    logger.info("Building Proximal Policy Optimization (PPO) Actor-Critic Network...")
    # device="cpu" enforced here to ensure local runability without crashing memory
    model = PPO("MlpPolicy", env, verbose=1, device="cpu", batch_size=16)
    
    logger.info(f"Executing Deep RL training loop ({args.timesteps} timesteps)...")
    start = time.time()
    
    try:
        model.learn(total_timesteps=args.timesteps)
        logger.info(f"Training complete. Duration: {time.time()-start:.2f}s")
        
        os.makedirs("models/rl_agents", exist_ok=True)
        model.save("models/rl_agents/ppo_retoucher")
        logger.info("Agent Policy serialized and safely written to disk.")
    except Exception as e:
        logger.error(f"Training loop crashed gracefully: {e}")

if __name__ == "__main__":
    if 'PPO' in locals():
        main()
    else:
        print("Script failed to boot. Awaiting virtual environment dependencies.")
