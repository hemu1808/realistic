import os
import torch
import numpy as np
from PIL import Image

try:
    from datasets import load_dataset
    from torchvision import transforms
except ImportError:
    pass # Will be installed by user later

class RetouchDataset:
    """
    Enterprise ETL Pipeline for retouching datasets (mapping raw inputs -> expert edits).
    Uses huggingface datasets to pull cloud micro-batches robustly.
    """
    def __init__(self, dataset_name="sayakpaul/mit-adobe-fivek", split="train", max_samples=50):
        self.dataset_name = dataset_name
        self.max_samples = max_samples
        
        # Structural transforms (Resize to 256 for fast processing)
        try:
            self.transform = transforms.Compose([
                transforms.Resize((256, 256)),
                transforms.ToTensor(), # scales to 0.0 - 1.0
            ])
            
            print(f"Loading {dataset_name} (max samples: {max_samples})...")
            # Stream datasets natively without killing memory
            raw_data = load_dataset(dataset_name, split=split, streaming=True)
            self.data = []
            count = 0
            for item in raw_data:
                if count >= max_samples:
                    break
                self.data.append(item)
                count += 1
            print(f"Loaded {len(self.data)} paired samples into memory.")
        except Exception as e:
            print(f"Warning: Could not pull dataset {e}. Reverting to simulated tensor streams.")
            self.data = None

    def __len__(self):
        return len(self.data) if self.data else self.max_samples

    def __getitem__(self, idx):
        # Return paired arrays of shape (C, H, W)
        if self.data is None:
            # Simulated data for structural layout testing without massive local downloads
            return torch.rand(3, 256, 256), torch.rand(3, 256, 256)
            
        sample = self.data[idx]
        
        input_img = sample['input'] if 'input' in sample else sample.get('image', None)
        target_img = sample['target'] if 'target' in sample else sample.get('expert', None)
        
        if input_img is None or target_img is None:
            return torch.rand(3, 256, 256), torch.rand(3, 256, 256)
            
        if not isinstance(input_img, Image.Image):
            input_img = Image.fromarray(np.array(input_img))
        if not isinstance(target_img, Image.Image):
            target_img = Image.fromarray(np.array(target_img))
            
        x = self.transform(input_img.convert("RGB"))
        y = self.transform(target_img.convert("RGB"))
        
        return x, y
