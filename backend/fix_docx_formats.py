import os
from docx import Document

LICENSE_DIR = r"E:\vsc\project aws\liccense"

# Mapping logic based on movie genres
movie_formats = {
    "Attack_On_Titan_The_Last_Attack.docx": "2D, IMAX",
    "Chernobyl.docx": "2D",
    "Joker.docx": "2D, IMAX",
    "MI_Dead_Reckoning_Part_1.docx": "2D, IMAX",
    "MI_The_Final_Reckoning.docx": "2D, IMAX",
    "Noroi_The_Curse.docx": "2D",
    "One_Child_Nation.docx": "2D",
    "Suzume.docx": "2D, IMAX",
    "Tetsuo_The_Iron_Man.docx": "2D",
    "The_Purge_Anarchy.docx": "2D",
    "Us.docx": "2D",
    "Your_Name.docx": "2D, IMAX",
    "Zack_Snyder_Justice_League.docx": "2D, 3D, IMAX"
}

for filename in os.listdir(LICENSE_DIR):
    if filename.endswith(".docx") and not filename.startswith("~"):
        filepath = os.path.join(LICENSE_DIR, filename)
        
        try:
            doc = Document(filepath)
            
            # Find and replace the format paragraph
            for para in doc.paragraphs:
                if para.text.startswith("Định dạng:"):
                    new_format = movie_formats.get(filename, "2D")
                    para.text = f"Định dạng: {new_format}"
                    doc.save(filepath)
                    print(f"Updated {filename} -> {new_format}")
                    break
        except PermissionError:
            print(f"Permission denied for {filename}. Please close the file if it's open.")
        except Exception as e:
            print(f"Error on {filename}: {e}")
