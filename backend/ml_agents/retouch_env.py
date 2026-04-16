import numpy as np
import cv2

try:
    import gymnasium as gym
    from gymnasium import spaces
    import torch
except ImportError:
    pass # Will be installed by user later

class RestouchEnv(gym.Env if 'gym' in locals() else object):
    """
    OpenAI Gymnasium Environment.
    The AI Agent receives the Histogram features of the image and outputs OpenCV action parameters.
    """
    metadata = {"render_modes": ["human"]}
    
    def __init__(self, dataloader, max_steps=10):
        super(RestouchEnv, self).__init__()
        self.dataloader = dataloader
        self.max_steps = max_steps
        self.current_step = 0
        self.current_idx = 0
        
        # Action space mapping our Backend OpenCV nodes: 
        # 0: CLAHE intensity (0.0 to 3.0)
        # 1: Gamma correction shift (-0.5 to +0.5 multiplier)
        # 2: Luma shift (-0.2 to +0.2)
        self.action_space = spaces.Box(
            low=np.array([0.0, -0.5, -0.2]),
            high=np.array([3.0, 0.5, 0.2]),
            dtype=np.float32
        )
        
        # Observation space: color histograms (256 bins * 3 channels) = 768 flat vector
        self.observation_space = spaces.Box(low=0, high=1.0, shape=(768,), dtype=np.float32)
        
        self.x = None
        self.y = None
        
    def _get_obs(self, img_tensor):
        """Extract spatial histogram distribution from PyTorch tensor for deep CV evaluation."""
        img_np = (img_tensor.permute(1, 2, 0).numpy() * 255).astype(np.uint8)
        hist_b = cv2.calcHist([img_np], [0], None, [256], [0, 256])
        hist_g = cv2.calcHist([img_np], [1], None, [256], [0, 256])
        hist_r = cv2.calcHist([img_np], [2], None, [256], [0, 256])
        
        # Normalize probability distribution
        obs = np.concatenate([hist_b, hist_g, hist_r]).flatten()
        obs = obs / (obs.sum() + 1e-8) 
        return obs.astype(np.float32)
        
    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.current_step = 0
        
        # Pull random image from the dataset streaming pipeline
        self.current_idx = np.random.randint(0, len(self.dataloader))
        self.x, self.y = self.dataloader[self.current_idx]
        self.current_state = self.x.clone()
        return self._get_obs(self.current_state), {}

    def step(self, action):
        clahe_intensity, gamma_shift, luma_shift = action
        
        # Applying continuous tensor adjustments mimicking our AutoAdjust backend sliders
        new_state = self.current_state + luma_shift
        new_state = torch.pow(torch.clamp(new_state, 1e-4, 1.0), 1.0 - gamma_shift)
        new_state = torch.clamp(new_state, 0.0, 1.0)
        
        self.current_state = new_state
        
        # RL Reward structure: Negative L1 Loss against the Adobe-5K expert target
        loss = torch.nn.functional.l1_loss(self.current_state, self.y)
        reward = -loss.item()
        
        self.current_step += 1
        terminated = self.current_step >= self.max_steps
        truncated = False
        
        return self._get_obs(self.current_state), reward, terminated, truncated, {}
